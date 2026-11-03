/**
 * Live smoke test of the Gemini models named in `API_CONFIG`.
 *
 * CI only lints and builds, so a model swap is a changed string that passes
 * whatever the new model does with the prompts. This script runs the app's own
 * request functions from `services/llm.ts` against the real API, one check per
 * capability the key powers, and fails if any of them does not hold. It is what
 * the monthly model check runs before it merges a new model.
 *
 * Run with `npm run smoke:models` in a cloud session whose environment holds
 * the Gemini key as a network secret for generativelanguage.googleapis.com,
 * sent as the `x-goog-api-key` header. The key never enters this process.
 *
 * Every check reports its duration, and a passing one its tokens; the summary
 * at the end counts all tokens, failed attempts included. `--plan-runs N` and
 * `--image-runs N` repeat the meal plan and the recipe image, the two checks
 * whose duration the user waits on and whose token count varies from run to
 * run, and add a `MEDIAN` line for each; doc/gemini-models.md compares
 * models on those medians.
 */
import { readFile } from 'node:fs/promises';
import { API_CONFIG, DEFAULTS } from '../src/constants';
import {
  chatAboutRecipe,
  fetchStorageTip,
  generateRecipeImage,
  generateRecipes,
  identifyIngredientFromImage,
  transcribeRecipeFromImage,
} from '../src/services/llm';
import type { PantryItem, Recipe } from '../src/types';

// The request functions refuse an empty key and send it as `?key=`, and Google
// rejects any `key` parameter that is not a valid key, even when a valid
// header is present. So they get a placeholder, and the parameter is dropped
// before the request leaves; the proxy attaches the real key as a header.
const KEY = 'attached-by-proxy';

interface Part {
  text?: string;
  thought?: boolean;
  inlineData?: unknown;
}
interface Chunk {
  error?: { code?: number; message?: string; status?: string };
  candidates?: { content?: { parts?: Part[]; role?: string }; finishReason?: string }[];
  promptFeedback?: unknown;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
  };
  modelVersion?: string;
}

/**
 * Folds a `streamGenerateContent` SSE body into the single response
 * `generateContent` would have returned: thought summaries dropped, text parts
 * joined, other parts kept, and the last chunk's finish reason and usage.
 */
const foldStream = (sse: string): Chunk => {
  const chunks: Chunk[] = sse
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => JSON.parse(line.slice(5)));
  // A stream can start with HTTP 200 and still end in an error event; the
  // content before it is incomplete, not a result.
  const failed = chunks.find((c) => c.error)?.error;
  if (failed) throw new Error(`stream ${failed.status ?? 'error'}: ${failed.message ?? 'unknown'}`);
  const parts: Part[] = [];
  let finishReason: string | undefined;
  for (const chunk of chunks) {
    const candidate = chunk.candidates?.[0];
    finishReason = candidate?.finishReason ?? finishReason;
    for (const part of candidate?.content?.parts ?? []) {
      if (part.thought) continue;
      const last = parts.at(-1);
      if (part.text !== undefined && last?.text !== undefined) {
        last.text += part.text;
      } else {
        parts.push({ ...part });
      }
    }
  }
  const last = chunks.at(-1) ?? {};
  return {
    ...(chunks.some((c) => c.candidates) && {
      candidates: [{ content: { parts, role: 'model' }, finishReason }],
    }),
    promptFeedback: chunks.find((c) => c.promptFeedback)?.promptFeedback,
    usageMetadata: last.usageMetadata,
    modelVersion: chunks.map((c) => c.modelVersion).filter(Boolean).at(-1),
  };
};

interface Usage {
  calls: number;
  input: number;
  output: number;
}
const usage = new Map<string, Usage>();

// Google routes requests for a retired model to its successor without an
// error, so a model change can reach the live app with no change to the code.
// Every response names the model that answered; one that is not the requested
// model, or that names none, is a failure, since an unnamed answer leaves the
// routing unverified. The match is exact: a prefix test would let
// `gemini-3.6-flash-lite` pass for `gemini-3.6-flash`, and routing to a Lite
// model is what Google did with `gemini-2.5-flash`.
const rerouted = new Set<string>();

// The cloud environment's proxy drops a request that sends nothing back for 30
// seconds, and a meal plan thinks for longer than that before its first word.
// So requests go to `streamGenerateContent` with thought summaries switched
// on, which arrive within seconds and keep the connection busy, and the stream
// is folded back into the shape the app reads. The prompt, schema and model
// are the app's own; the summaries only report the thinking, they do not
// change it.
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  url.searchParams.delete('key');
  const model = /\/models\/([^/:]+):generateContent$/.exec(url.pathname)?.[1];
  if (!model) return realFetch(url, init);

  url.pathname = url.pathname.replace(/:generateContent$/, ':streamGenerateContent');
  url.searchParams.set('alt', 'sse');
  const request = JSON.parse(String(init?.body));
  request.generationConfig = {
    ...request.generationConfig,
    thinkingConfig: { ...request.generationConfig?.thinkingConfig, includeThoughts: true },
  };
  const response = await realFetch(url, { ...init, body: JSON.stringify(request) });
  if (!response.ok) return response;

  const body = foldStream(await response.text());
  if (body.modelVersion !== model) {
    rerouted.add(`requested ${model}, answered by ${body.modelVersion ?? 'an unnamed model'}`);
  }
  const u = body.usageMetadata;
  const entry = usage.get(model) ?? { calls: 0, input: 0, output: 0 };
  entry.calls += 1;
  entry.input += u?.promptTokenCount ?? 0;
  // Thinking is billed as output.
  entry.output += (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0);
  usage.set(model, entry);

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}) as typeof fetch;

const fixture = async (name: string): Promise<string> =>
  (await readFile(new URL(`./fixtures/${name}`, import.meta.url))).toString('base64');

const expect = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

// The request functions throw translated, user-facing messages and keep the
// technical reason in `cause`.
const describe = (error: unknown): string => {
  const parts: string[] = [];
  for (let e: unknown = error; e; e = e instanceof Error ? e.cause : undefined) {
    parts.push(e instanceof Error ? e.message : String(e));
  }
  return parts.join(' <- ');
};

interface Outcome {
  ok: boolean;
  secs: number;
  input: number;
  output: number;
}

const totals = () => {
  let input = 0;
  let output = 0;
  for (const u of usage.values()) {
    input += u.input;
    output += u.output;
  }
  return { input, output };
};

// One retry, because a single transient upstream failure is not a verdict on
// the model. Duration and tokens are those of the attempt that passed.
const check = async (name: string, run: () => Promise<string>): Promise<Outcome> => {
  for (let attempt = 1; ; attempt++) {
    const before = totals();
    const start = performance.now();
    try {
      const detail = await run();
      const secs = (performance.now() - start) / 1000;
      const after = totals();
      const outcome = { ok: true, secs, input: after.input - before.input, output: after.output - before.output };
      console.log(`PASS  ${name}: ${detail} (${secs.toFixed(1)} s, ${outcome.input} / ${outcome.output} tokens)`);
      return outcome;
    } catch (error) {
      if (attempt === 2) {
        const secs = (performance.now() - start) / 1000;
        console.log(`FAIL  ${name}: ${describe(error)} (${secs.toFixed(1)} s, final attempt)`);
        return { ok: false, secs: NaN, input: 0, output: 0 };
      }
      console.log(`retry ${name}: ${describe(error)}`);
    }
  }
};

const runsOf = (flag: string): number => {
  const i = process.argv.indexOf(flag);
  const n = i < 0 ? 1 : Number(process.argv[i + 1]);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${flag} needs a positive whole number`);
  return n;
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const repeated = async (name: string, runs: number, run: () => Promise<string>): Promise<boolean> => {
  const outcomes: Outcome[] = [];
  for (let i = 1; i <= runs; i++) {
    outcomes.push(await check(runs > 1 ? `${name} ${i}/${runs}` : name, run));
  }
  const ok = outcomes.every((o) => o.ok);
  if (ok && runs > 1) {
    const secs = median(outcomes.map((o) => o.secs));
    const input = median(outcomes.map((o) => o.input));
    const output = median(outcomes.map((o) => o.output));
    console.log(`MEDIAN ${name} over ${runs}: ${secs.toFixed(1)} s, ${input} / ${output} tokens`);
  }
  return ok;
};

const planRuns = runsOf('--plan-runs');
const imageRuns = runsOf('--image-runs');

const language = DEFAULTS.LANGUAGE;

const pantry: PantryItem[] = [
  { id: 'p1', name: 'carrots', amount: '500 g' },
  { id: 'p2', name: 'chickpeas', amount: '1 tin' },
  { id: 'p3', name: 'rice', amount: '300 g' },
  { id: 'p4', name: 'onions', amount: '2' },
];

// Fixed rather than taken from the generated plan, so a failing plan does not
// drag the chat and image checks down with it.
const lemonRice: Recipe = {
  id: 'r1',
  title: 'Lemon Rice',
  servings: 2,
  instructions: [
    'Rinse the rice and cook it in 400 ml salted water for 15 minutes.',
    'Zest and juice the lemon.',
    'Stir the butter, zest and juice into the hot rice and serve.',
  ],
  ingredients: [
    { item: 'basmati rice', amount: '200 g' },
    { item: 'lemon', amount: '1' },
    { item: 'butter', amount: '2 tbsp' },
    { item: 'salt', amount: '1 tsp' },
  ],
  usedIngredients: [],
  time: '25 minutes',
};

console.log(`Models: text ${API_CONFIG.MODEL}, image ${API_CONFIG.IMAGE_MODEL}\n`);

const results = [
  await repeated('meal plan', planRuns, async () => {
    const plan = await generateRecipes(KEY, pantry, 2, 2, DEFAULTS.DIET, language);
    expect(plan.recipes.length === 2, `asked for 2 recipes, got ${plan.recipes.length}`);
    const ids = new Set(pantry.map((p) => p.id));
    for (const r of plan.recipes) {
      expect(r.ingredients.length > 0 && r.instructions.length > 0, `"${r.title}" is empty`);
      expect(r.usedIngredients.every((id) => ids.has(id)), `"${r.title}" cites unknown pantry ids`);
    }
    // Using up the pantry is the point of the app, and all four items suit
    // any diet, so a plan that touches none of them ignored the prompt.
    expect(plan.recipes.some((r) => r.usedIngredients.length > 0), 'plan uses no pantry item');
    return plan.recipes.map((r) => r.title).join(' / ');
  }),
  (await check('storage tip', async () => {
    const tip = await fetchStorageTip(KEY, 'carrots', language);
    expect(tip.trim().length > 0 && tip.length < 600, `unexpected length ${tip.length}`);
    return `${tip.length} chars`;
  })).ok,
  (await check('chat', async () => {
    const reply = await chatAboutRecipe(
      KEY,
      lemonRice,
      [{ role: 'user', text: 'Can I use a lime instead of the lemon?' }],
      language
    );
    expect(reply.trim().length > 0, 'empty reply');
    return `${reply.length} chars`;
  })).ok,
  await repeated('recipe image', imageRuns, async () => {
    const image = await generateRecipeImage(KEY, lemonRice.title, lemonRice.ingredients);
    expect(image.type.startsWith('image/') && image.size > 10_000, `${image.type}, ${image.size} bytes`);
    return `${image.type}, ${Math.round(image.size / 1024)} KB`;
  }),
  (await check('ingredient photo', async () => {
    const name = await identifyIngredientFromImage(KEY, await fixture('lemon.jpg'), 'image/jpeg', language);
    expect(/lemon/i.test(name), `expected a lemon, got "${name}"`);
    return name;
  })).ok,
  (await check('recipe photo', async () => {
    const { text, truncated } = await transcribeRecipeFromImage(
      KEY,
      await fixture('recipe-card.jpg'),
      'image/jpeg'
    );
    expect(!truncated, 'truncated');
    for (const needle of ['Lemon Rice', '200 g', '400 ml']) {
      expect(text.includes(needle), `missing "${needle}"`);
    }
    return `${text.split('\n').length} lines`;
  })).ok,
];

for (const reroute of rerouted) console.log(`FAIL  model version: ${reroute}`);
if (rerouted.size === 0) console.log('PASS  model version: every response came from the requested model');
results.push(rerouted.size === 0);

console.log('\nTokens (input / output incl. thinking):');
for (const [model, u] of usage) {
  console.log(`  ${model}: ${u.input} / ${u.output} over ${u.calls} calls`);
}

const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exitCode = failed ? 1 : 0;
