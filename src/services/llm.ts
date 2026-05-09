import { z } from 'zod';
import { API_CONFIG } from '../constants';
import { translations } from '../constants/translations';
import type { PantryItem, MealPlan, Ingredient } from '../types';

/**
 * Sanitizes user input to prevent prompt injection attacks.
 *
 * @param input - The user-provided string to sanitize
 * @param maxLength - Maximum allowed length (default: 200 for short fields, 1000 for long fields)
 * @returns Sanitized string safe for inclusion in LLM prompts
 */
const sanitizeUserInput = (input: string, maxLength: number = 200): string => {
  if (!input) return '';

  // Limit length to prevent excessively long inputs
  let sanitized = input.slice(0, maxLength);

  // Replace newlines with spaces to prevent multi-line prompt injection
  sanitized = sanitized.replace(/[\r\n]+/g, ' ');

  // Remove control characters that could break prompt structure
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Trim excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
};

/**
 * Zod schemas for runtime validation of LLM responses.
 * These ensure the parsed JSON matches our expected types.
 * Exported for reuse in URL parameter validation.
 */
export const IngredientSchema = z.object({
  item: z.string(),
  amount: z.string(),
  unit: z.string().optional(),
});

export const NutritionSchema = z.object({
  calories: z.number(),
  carbs: z.number(),
  fat: z.number(),
  protein: z.number(),
});

export const RecipeSchema = z.object({
  id: z.string(),
  title: z.string(),
  time: z.string(),
  ingredients: z.array(IngredientSchema),
  instructions: z.array(z.string()),
  usedIngredients: z.array(z.string()),
  // Optional because shared recipes exclude missingIngredients (not relevant in standalone view)
  missingIngredients: z.array(IngredientSchema).optional(),
  nutrition: NutritionSchema.optional(),
  comments: z.string().optional(),
});

export const MealPlanSchema = z.object({
  recipes: z.array(RecipeSchema),
  shoppingList: z.array(IngredientSchema),
});

/**
 * Parameters for building a recipe prompt.
 */
/**
 * Error translations for user-facing error messages.
 */
export interface ErrorTranslations {
  invalidStructure: string;
  tryAgain: string;
  invalidJson: string;
  apiKeyRequired: string;
  fetchFailed: string;
  emptyResponse: string;
  timeout: string;
  networkError: string;
  unexpectedError: string;
  imageBlocked: string;
  imageNoData: string;
  imageQuotaExceeded: string;
}


/**
 * Parameters for building a recipe prompt.
 */
export interface RecipePromptParams {
  ingredients: PantryItem[];
  people: number;
  meals: number;
  diet: string;
  language: string;
  spices?: string[];
  appliances?: string[];
  styleWishes?: string[];
}

/**
 * Builds the prompt for recipe generation.
 * Exported so it can be used by the copy-paste flow.
 */
export const buildRecipePrompt = ({
  ingredients,
  people,
  meals,
  diet,
  language,
  spices = [],
  appliances = [],
  styleWishes = [],
}: RecipePromptParams): string => {
  const pantryList = ingredients
    .map((v) => `- ${sanitizeUserInput(v.name)} (${sanitizeUserInput(v.amount)}) [ID: ${v.id}]`)
    .join("\n");

  const spiceList = spices.length > 0
    ? `Available Spices/Staples (Do NOT add to shopping list): ${spices.map(s => sanitizeUserInput(s)).join(", ")}`
    : "No extra spices or staples available.";

  const applianceList = appliances.length > 0
    ? `Available Special Kitchen Appliances: ${appliances.map(a => sanitizeUserInput(a)).join(", ")}`
    : "";

  const sanitizedStyleWishes = styleWishes
    .map(wish => sanitizeUserInput(wish, 200))
    .filter(wish => wish.length > 0)
    .join(", ");
  const styleWishesText = sanitizedStyleWishes
    ? `STYLE/WISHES: ${sanitizedStyleWishes}`
    : "";

  const sanitizedDiet = sanitizeUserInput(diet, 200);

  return `
    You are a smart recipe planner. 

    I need a meal plan for ${meals} distinct meals for ${people} people.

    ${ingredients.length > 0 ? `I have these ingredients in my pantry:\n${pantryList}` : `My pantry is empty. Choose suitable ingredients for the recipes.`}

    ${spiceList}
    ${applianceList}

    DIETARY PREFERENCE: ${sanitizedDiet}
    LANGUAGE: ${language}
    ${styleWishesText}

    RULES:
    1. STRICTLY follow the dietary preference: ${sanitizedDiet}.${sanitizedStyleWishes ? ` Also respect the style/wishes: ${sanitizedStyleWishes}. This should guide the cuisine type, dietary restrictions, or cooking style preferences.` : ''}
    2. ${ingredients.length > 0 ? 'Prioritize using as many of my pantry ingredients as possible.' : 'Choose suitable ingredients for delicious, balanced meals.'}
    3. The portion sizes must be realistic for ${people} people.
    4. ${ingredients.length > 0 ? `When a pantry item's quantity is enough for one recipe (e.g., 500 g potatoes as a side for 2 people, or 400 g chicken breast as a main for 2 people), use it entirely in that recipe rather than splitting it across multiple recipes. Only distribute a pantry item across recipes if the total quantity is large enough that each recipe receives a full, realistic serving per person.` : 'Ensure each recipe uses realistic quantities of each ingredient.'}
    5. ${ingredients.length > 0 ? `If there are too few ingredients to generate ${meals} meals for ${people} people, do not stretch the same few ingredients across all meals if it results in repetitive or poor-quality recipes. Instead generate recipes with different ingredients that will have to be bought.` : `For every meal, choose ingredients that work well together and create balanced, delicious meals.`}
    6. ${ingredients.length > 0 ? `If I have too few ingredients for the requested amount of meals, supplement with additional ingredients from your own knowledge and add them to the "missingIngredients" array.` : `All ingredients ${spices.length > 0 ? '(except available spices/staples)' : ''} will need to be purchased and should be listed in the "missingIngredients" array. Set "usedIngredients" to an empty array.`}
    7. Ensure variety: The ${meals} meals should be distinct in style and flavor profile.
    8. Each meal should be intentionally composed — consider what makes it interesting and satisfying according to its own culinary logic: that might be flavor balance, textural contrast, moisture, temperature, color, spice complexity, or something else entirely.
    9. Let the available spices and staples guide the recipes. Not all spices or staples need to be used.
    10. Output ALL text (recipe titles, ingredients, instructions, shopping list items) in ${language}.
    11. The "ingredients" array must contain EVERY single ingredient needed for the recipe: pantry items, items to buy, and any spice rack items used in the recipe.
    12. The "missingIngredients" array must ONLY contain items I need to buy. DO NOT include spices and staples if they are listed in "Available Spices/Staples".
    13. Each recipe's "missingIngredients" must list only the ingredients that specific recipe requires to be purchased, at the amount needed for that recipe alone. Do not combine amounts across recipes in "missingIngredients".
    14. The "item" field MUST NOT include the "amount". Keep them separate. Example: {"item": "Carrots", "amount": "500g"}, NOT {"item": "Carrots 500g"}.
    15. Ensure "missingIngredients" is a list of distinct objects, not one combined string.
    16. If you need to buy spices or staples, use the "missingIngredients" array.
    17. The top-level "shoppingList" is the aggregated shopping list across all recipes. If the same ingredient is needed in multiple recipes, combine the totals here.
    18. Return ONLY valid JSON. No JSON-comments, no markdown formatting, no code blocks, no enumeration, no entrance statements before the JSON. Never use double quote characters (") inside string values; use single quotes (') if you need to quote something within a string.
    20. Optionally include a "comments" field per recipe (1-2 sentences). Use it for a fun or surprising scientific, historical or geographical fact about the dish or its ingredients -- or, if the user provided unusual or inedible items, a lighthearted remark about why you skipped them. NO SALES TALK! Use single quotes (') for any quotations within the text.
    
    NUTRITION ESTIMATES:
    - Provide rough nutritional estimates PER SERVING (for one person) in the "nutrition" object.
    - "calories" is in kcal. "carbs", "fat", and "protein" are in grams.
    - These are estimates based on typical ingredient values. Round to whole numbers.

    JSON Structure:
    {
      "recipes": [
        {
          "id": "unique_id",
          "title": "Recipe Name",
          "time": "30 mins",
          "ingredients": [ {"item": "Name", "amount": "Quantity"} ],
          "instructions": ["Step 1", "Step 2"],
          "usedIngredients": ["pantry_item_id_1", "pantry_item_id_2"],
          "missingIngredients": [{"item": "Chicken", "amount": "500g"}],
          "nutrition": {"calories": 450, "carbs": 35, "fat": 18, "protein": 28},
          "comments": "(optional) Fun scientific, historical or geographical fact or comment about omission of inedible ingredients about this recipe or its ingredients."
        }
      ],
      "shoppingList": [
        {"item": "Chicken", "amount": "500g"}
      ]
    }
  `;
};

/**
 * Attempts to repair unescaped double quotes inside JSON string values.
 *
 * Uses a character-by-character state machine: when inside a string value,
 * a `"` is treated as a closing quote only if it is immediately followed by
 * a JSON-structural character (`:`, `,`, `}`, `]`) or end-of-input. All other
 * `"` characters inside a string are escaped to `\"`.
 *
 * This handles the common LLM mistake of embedding raw double quotes in free-text
 * fields such as `"comments"` or `"instructions"`, e.g.:
 *   `"comments": "Known as "paella" in Spain."`
 * becomes:
 *   `"comments": "Known as \"paella\" in Spain."`
 */
const repairUnescapedQuotes = (text: string): string => {
  const result: string[] = [];
  let inString = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (!inString) {
      result.push(ch);
      if (ch === '"') inString = true;
    } else if (ch === '\\' && i + 1 < text.length) {
      // Escape sequence: copy both chars and stay inside the string
      result.push(ch, text[++i]);
    } else if (ch === '"') {
      // Look past any whitespace to find the next meaningful character
      let j = i + 1;
      while (j < text.length && ' \t\r\n'.includes(text[j])) j++;
      const next = j < text.length ? text[j] : '';
      if (':,}]'.includes(next) || next === '') {
        // Structural context: this is the closing quote
        inString = false;
        result.push(ch);
      } else {
        // Content context: escape the interior quote
        result.push('\\', '"');
      }
    } else {
      result.push(ch);
    }

    i++;
  }

  return result.join('');
};

/**
 * Parses the LLM response text into a MealPlan.
 * Exported so it can be used by the copy-paste flow.
 * Now includes runtime validation using Zod to ensure data structure is correct.
 */
export const parseRecipeResponse = (text: string, errorTranslations?: ErrorTranslations): MealPlan => {
  let cleanedText = text;

  // Step 1: Clean up markdown code blocks first (sometimes models add ```json ... ```)
  cleanedText = cleanedText.replace(/```json/g, "").replace(/```/g, "").trim();

  // Step 2: Replace typographic quotes with standard double quotes to handle copy-paste from devices/apps that auto-format
// Covers English (“”), German („“), and Swiss/French («») double quotes
  cleanedText = cleanedText.replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"');

  // Step 3: Strip everything after the last closing brace
  // This removes trailing content like source references that some LLMs append
  const lastBraceIndex = cleanedText.lastIndexOf('}');
  if (lastBraceIndex !== -1) {
    cleanedText = cleanedText.substring(0, lastBraceIndex + 1);
  }

  // Step 4: Strip inline markdown links entirely (some LLMs like Perplexity add these)
  // Pattern: " [text](url)" -> "" (removes the entire markdown link including whitespace)
  // The [^\]\n]+ ensures we don't match across newlines (which would accidentally match JSON array brackets)
  cleanedText = cleanedText.replace(/\s*\[([^\]\n]+)\]\([^)\n]+\)/g, '');

  const errors = errorTranslations ?? translations.English.errors;

  // Step 5: Parse JSON, with a fallback repair pass for unescaped interior quotes
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedText);
  } catch {
    // JSON.parse failed — attempt to repair unescaped double quotes in string values and retry
    try {
      parsed = JSON.parse(repairUnescapedQuotes(cleanedText));
    } catch {
      console.error("JSON Parse Error. Raw response:", cleanedText);
      throw new Error(errors.invalidJson);
    }
  }

  try {
    // Validate the parsed data against our schema
    const validated = MealPlanSchema.parse(parsed);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Zod validation failed - the JSON structure doesn't match expectations
      console.error("Validation Error:", error.issues);
      const firstError = error.issues[0];
      const path = firstError.path.join('.');
      throw new Error(
        `${errors.invalidStructure}: ${firstError.message}${path ? ` at ${path}` : ''}. ` +
        errors.tryAgain,
        { cause: error }
      );
    }
    throw new Error(errors.invalidJson, { cause: error });
  }
};

export const fetchStorageTip = async (
  apiKey: string,
  ingredientName: string,
  language: string,
  errorTranslations?: ErrorTranslations
): Promise<string> => {
  const errors = errorTranslations ?? translations.English.errors;

  if (!apiKey) throw new Error(errors.apiKeyRequired);

  const sanitized = sanitizeUserInput(ingredientName, 100);
  if (!sanitized) throw new Error(errors.unexpectedError);

  const prompt = `Provide concise, practical storage advice for the ingredient: "${sanitized}".

  RULES:
  - 1-3 short sentences in plain prose. No lists, headings, markdown, JSON, or quotes around the response.
  - Cover where to store it (room temperature, fridge, freezer, etc.), expected shelf life when stored well, and a brief tip if relevant (e.g. "keep dry", "wrap in paper", "don't store next to apples").
  - Output the response in ${language}.
  - When addressing the reader in a language with a T-V distinction, ALWAYS use the informal second person singular: "du" in German, "tu" in French, "tú" in Spanish. Never use the formal form ("Sie", "vous", "usted").
  - Output ONLY the storage advice text — no preamble, no labels, no quotation marks.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    const response = await fetch(
      `${API_CONFIG.BASE_URL}/${API_CONFIG.MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || errors.fetchFailed);
    }

    const data = await response.json();
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error(errors.emptyResponse);

    return text.trim().replace(/^["']+|["']+$/g, '').trim();
  } catch (error) {
    console.error("Storage tip error:", error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') throw new Error(errors.timeout, { cause: error });
      if (error.message.includes('Failed to fetch')) throw new Error(errors.networkError, { cause: error });
      throw error;
    }

    throw new Error(errors.unexpectedError, { cause: error });
  }
};

/**
 * Generates an appetizing food photo for a recipe via Gemini's image model.
 * Returns the image as a Blob so the caller can persist it in IndexedDB
 * without the ~33% size penalty of base64.
 */
export const generateRecipeImage = async (
  apiKey: string,
  recipeTitle: string,
  ingredients: Ingredient[],
  errorTranslations?: ErrorTranslations
): Promise<Blob> => {
  const errors = errorTranslations ?? translations.English.errors;

  if (!apiKey) throw new Error(errors.apiKeyRequired);

  const sanitizedTitle = sanitizeUserInput(recipeTitle, 200);
  if (!sanitizedTitle) throw new Error(errors.unexpectedError);

  const topIngredients = ingredients
    .slice(0, 5)
    .map((i) => sanitizeUserInput(i.item, 60))
    .filter((s) => s.length > 0)
    .join(', ');

  const prompt = `An appetizing overhead food photograph of '${sanitizedTitle}'${
    topIngredients ? `, featuring ${topIngredients}` : ''
  }. Natural daylight, shallow depth of field, plated on a simple ceramic dish on a wooden table. Photorealistic, magazine-quality food photography. No text, no watermarks, no logos.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    const response = await fetch(
      `${API_CONFIG.BASE_URL}/${API_CONFIG.IMAGE_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      // `|| {}` guards against a literal `null` JSON body, which
      // `response.json()` resolves (without throwing) and would otherwise
      // crash the `errorData.error` access below.
      const errorData = (await response.json().catch(() => ({}))) || {};
      // Free-tier Gemini API has limit: 0 for image-generation models, so the
      // very first request returns 429 RESOURCE_EXHAUSTED. The raw Google
      // message is opaque to non-developers — surface an actionable hint.
      if (response.status === 429 || errorData.error?.status === 'RESOURCE_EXHAUSTED') {
        throw new Error(errors.imageQuotaExceeded);
      }
      throw new Error(errorData.error?.message || errors.unexpectedError);
    }

    const data = await response.json();

    // Prompt-level block: no candidates, with a top-level promptFeedback.
    if (!data.candidates || data.candidates.length === 0) {
      if (data.promptFeedback?.blockReason) throw new Error(errors.imageBlocked);
      throw new Error(errors.imageNoData);
    }

    const candidate = data.candidates[0];

    // Response-level block: finishReason is SAFETY / PROHIBITED_CONTENT / etc.
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(errors.imageBlocked);
    }

    const parts: Array<{ inlineData?: { data?: string; mimeType?: string } }> | undefined =
      candidate.content?.parts;
    const imagePart = parts?.find((p) => p.inlineData?.data);
    const base64 = imagePart?.inlineData?.data;
    const mimeType = imagePart?.inlineData?.mimeType ?? 'image/png';

    if (!base64) throw new Error(errors.imageNoData);

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
  } catch (error) {
    console.error('Image generation error:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') throw new Error(errors.timeout, { cause: error });
      if (error.message.includes('Failed to fetch')) throw new Error(errors.networkError, { cause: error });
      throw error;
    }

    throw new Error(errors.unexpectedError, { cause: error });
  }
};

export type IdentifyIngredientErrorKind = 'unknown' | 'multiple' | 'quota' | 'decode' | 'error';

export class IdentifyIngredientError extends Error {
  kind: IdentifyIngredientErrorKind;
  constructor(kind: IdentifyIngredientErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'IdentifyIngredientError';
    this.kind = kind;
  }
}

/**
 * Identifies a single food ingredient in a photo via Gemini's vision model.
 * Returns the ingredient name as a plain string in the requested language.
 * Throws an `IdentifyIngredientError` with a `kind` discriminator the UI uses
 * to pick the right message (UNKNOWN, MULTIPLE, quota, or generic error).
 */
export const identifyIngredientFromImage = async (
  apiKey: string,
  base64Image: string,
  mimeType: string,
  language: string,
  signal?: AbortSignal
): Promise<string> => {
  if (!apiKey) throw new IdentifyIngredientError('error', 'API Key is required');

  const prompt = `You identify food ingredients in photos.

Look at the photo and respond with EXACTLY ONE of:

1. The name of the most prominent ingredient, in ${language}, with no extra words, punctuation, quantity, or description. Just the name. If one ingredient is clearly the main subject (centered, in focus, or taking up most of the frame), name that one — even if other ingredients are partly visible at the edges or in the background.
2. The exact token MULTIPLE — only if two or more distinct food ingredients share the focus roughly equally and no single one stands out as the main subject. Ignore incidental items like hands, plates, cutting boards, or packaging — those don't count as ingredients.
3. The exact token UNKNOWN — if you cannot confidently identify the ingredient, the photo is unclear, or it does not show food.

Respond with only one line. No explanation.`;

  const timeoutSignal = AbortSignal.timeout(API_CONFIG.TIMEOUT_MS);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/${API_CONFIG.MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType, data: base64Image } },
                { text: prompt },
              ],
            },
          ],
        }),
        signal: combinedSignal,
      }
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) || {};
      if (response.status === 429 || errorData.error?.status === 'RESOURCE_EXHAUSTED') {
        throw new IdentifyIngredientError('quota', 'Quota exceeded');
      }
      throw new IdentifyIngredientError('error', errorData.error?.message || 'Fetch failed');
    }

    const data = await response.json();

    // Prompt-level block (no candidates, with promptFeedback) or empty candidate list.
    if (!data.candidates || data.candidates.length === 0) {
      throw new IdentifyIngredientError(
        'error',
        data.promptFeedback?.blockReason ? 'Blocked by safety filter' : 'Empty response'
      );
    }
    const candidate = data.candidates[0];
    // Response-level block: finishReason is SAFETY / PROHIBITED_CONTENT / etc.
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      throw new IdentifyIngredientError('error', 'Blocked by safety filter');
    }
    const text: string | undefined = candidate.content?.parts?.[0]?.text;
    if (!text) throw new IdentifyIngredientError('error', 'Empty response');

    // Strip wrapping quotes and any markdown emphasis the model occasionally adds despite the prompt.
    const cleaned = text.trim().replace(/^["'*_]+|["'*_]+$/g, '').trim();
    if (cleaned === 'UNKNOWN') throw new IdentifyIngredientError('unknown', 'Unknown ingredient');
    if (cleaned === 'MULTIPLE') throw new IdentifyIngredientError('multiple', 'Multiple ingredients');

    const finalName = cleaned.replace(/[.;:!?]+$/, '').trim();
    if (!finalName) throw new IdentifyIngredientError('error', 'Empty name');
    return finalName;
  } catch (error) {
    if (error instanceof IdentifyIngredientError) throw error;
    if (error instanceof Error) {
      // Caller-initiated abort: re-throw as-is so the UI can distinguish cancel from error.
      if (error.name === 'AbortError' && signal?.aborted) throw error;
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new IdentifyIngredientError('error', 'Timeout', { cause: error });
      }
    }
    console.error('Identify ingredient error:', error);
    throw new IdentifyIngredientError('error', 'Unexpected error', { cause: error });
  }
};

export const generateRecipes = async (
  apiKey: string,
  ingredients: PantryItem[],
  people: number,
  meals: number,
  diet: string,
  language: string,
  spices: string[] = [],
  appliances: string[] = [],
  styleWishes: string[] = [],
  errorTranslations?: ErrorTranslations,
  externalSignal?: AbortSignal
): Promise<MealPlan> => {
  const errors = errorTranslations ?? translations.English.errors;

  if (!apiKey) throw new Error(errors.apiKeyRequired);

  const prompt = buildRecipePrompt({
    ingredients,
    people,
    meals,
    diet,
    language,
    spices,
    appliances,
    styleWishes,
  });

  const timeoutSignal = AbortSignal.timeout(API_CONFIG.TIMEOUT_MS);
  const signal = externalSignal
    ? AbortSignal.any([externalSignal, timeoutSignal])
    : timeoutSignal;

  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/${API_CONFIG.MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
        signal,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || errors.fetchFailed);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error(errors.emptyResponse);

    return parseRecipeResponse(text, errors);
  } catch (error) {
    console.error("LLM Error:", error);

    // Handle specific error types with user-friendly messages
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        // Preserve AbortError when the caller initiated the cancel; otherwise it's a timeout.
        if (externalSignal?.aborted) throw error;
        throw new Error(errors.timeout, { cause: error });
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error(errors.networkError, { cause: error });
      }
      // Re-throw with original message if already a user-friendly error
      throw error;
    }

    throw new Error(errors.unexpectedError, { cause: error });
  }
};
