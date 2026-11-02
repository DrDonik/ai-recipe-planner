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
  candidates?: { content?: { parts?: Part[]; role?: string }; finishReason?: string }[];
  promptFeedback?: unknown;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
  };
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
  };
};

interface Usage {
  calls: number;
  input: number;
  output: number;
}
const usage = new Map<string, Usage>();

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

// One retry, because a single transient upstream failure is not a verdict on
// the model.
const check = async (name: string, run: () => Promise<string>): Promise<boolean> => {
  for (let attempt = 1; ; attempt++) {
    try {
      console.log(`PASS  ${name}: ${await run()}`);
      return true;
    } catch (error) {
      if (attempt === 2) {
        console.log(`FAIL  ${name}: ${describe(error)}`);
        return false;
      }
      console.log(`retry ${name}: ${describe(error)}`);
    }
  }
};

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
  await check('meal plan', async () => {
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
  await check('storage tip', async () => {
    const tip = await fetchStorageTip(KEY, 'carrots', language);
    expect(tip.trim().length > 0 && tip.length < 600, `unexpected length ${tip.length}`);
    return `${tip.length} chars`;
  }),
  await check('chat', async () => {
    const reply = await chatAboutRecipe(
      KEY,
      lemonRice,
      [{ role: 'user', text: 'Can I use a lime instead of the lemon?' }],
      language
    );
    expect(reply.trim().length > 0, 'empty reply');
    return `${reply.length} chars`;
  }),
  await check('recipe image', async () => {
    const image = await generateRecipeImage(KEY, lemonRice.title, lemonRice.ingredients);
    expect(image.type.startsWith('image/') && image.size > 10_000, `${image.type}, ${image.size} bytes`);
    return `${image.type}, ${Math.round(image.size / 1024)} KB`;
  }),
  await check('ingredient photo', async () => {
    const name = await identifyIngredientFromImage(KEY, await fixture('lemon.jpg'), 'image/jpeg', language);
    expect(/lemon/i.test(name), `expected a lemon, got "${name}"`);
    return name;
  }),
  await check('recipe photo', async () => {
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
  }),
];

console.log('\nTokens (input / output incl. thinking):');
for (const [model, u] of usage) {
  console.log(`  ${model}: ${u.input} / ${u.output} over ${u.calls} calls`);
}

const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exitCode = failed ? 1 : 0;
