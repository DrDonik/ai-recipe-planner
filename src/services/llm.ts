import { z } from 'zod';
import { API_CONFIG } from '../constants';
import { translations } from '../constants/translations';
import type { PantryItem, MealPlan } from '../types';

// Re-export types for backwards compatibility
export type { PantryItem, Ingredient, Recipe, MealPlan, Nutrition } from '../types';

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
  styleWishes = [],
}: RecipePromptParams): string => {
  const pantryList = ingredients
    .map((v) => `- ${sanitizeUserInput(v.name)} (${sanitizeUserInput(v.amount)}) [ID: ${v.id}]`)
    .join("\n");

  const spiceList = spices.length > 0
    ? `Available Spices/Staples (Do NOT add to shopping list): ${spices.map(s => sanitizeUserInput(s)).join(", ")}`
    : "No extra spices available.";

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

    DIETARY PREFERENCE: ${sanitizedDiet}
    LANGUAGE: ${language}
    ${styleWishesText}

    RULES:
    1. STRICTLY follow the dietary preference: ${sanitizedDiet}.${sanitizedStyleWishes ? ` Also respect the style/wishes: ${sanitizedStyleWishes}. This should guide the cuisine type, dietary restrictions, or cooking style preferences.` : ''}
    2. ${ingredients.length > 0 ? 'Prioritize using as many of my pantry ingredients as possible.' : 'Choose suitable ingredients for delicious, balanced meals.'}
    3. The portion sizes must be realistic for ${people} people.
    4. Ensure variety: The ${meals} meals should be distinct in style and flavor profile.
    5. For every meal, use the five basic flavors - sweetness, sourness, bitterness, saltiness, and umami - and the five basic textures - soft, crispy, chewy, crunchy, and tender - as a guidance. Try to balance them, but never dogmatically.
    6. For every meal, check if a sauce, gravy or dip could enhance the meal.
    7. ${ingredients.length > 0 ? `If there are too few ingredients to generate ${meals} meals for ${people} people, do not stretch the same few ingredients across all meals if it results in repetitive or poor-quality recipes. Instead generate recipes with different ingredients that will have to be bought.` : `Choose ingredients that work well together and create balanced, delicious meals.`}
    8. ${ingredients.length > 0 ? `If I have too few ingredients for the requested amount of meals, supplement with additional ingredients from your own knowledge and add them to the "missingIngredients" array.` : `All ingredients will need to be purchased and should be listed in the "missingIngredients" array. Set "usedIngredients" to an empty array.`}
    9. Let the available spices and staples guide the recipes. Not all spices or staples need to be used.
    10. Output ALL text (recipe titles, ingredients, instructions, shopping list items) in ${language}.
    11. The "ingredients" array must contain EVERY single ingredient needed for the recipe (both what I have and what I need to buy).
    12. The "missingIngredients" array must ONLY contain items I need to buy. DO NOT include spices if they are listed in "Available Spices".
    13. If the same ingredient is missing in different recipes, combine them in the "missingIngredients" array and total the amount needed.
    14. The "item" field MUST NOT include the "amount". Keep them separate. Example: {"item": "Carrots", "amount": "500g"}, NOT {"item": "Carrots 500g"}.
    15. Ensure "missingIngredients" is a list of distinct objects, not one combined string.
    16. If you need to buy spices or staples, use the "missingIngredients" array.
    17. Return ONLY valid JSON. No JSON-comments, no markdown formatting, no code blocks, no enumeration, no entrance statements before the JSON ...
    18. Optionally include a "comments" field per recipe (1-2 sentences). Use it for a fun or surprising scientific, historical or geographical fact about the dish or its ingredients -- or, if the user provided unusual or inedible items, a lighthearted remark about why you skipped them. NO SALES TALK!
    
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
 * Parses the LLM response text into a MealPlan.
 * Exported so it can be used by the copy-paste flow.
 * Now includes runtime validation using Zod to ensure data structure is correct.
 */
export const parseRecipeResponse = (text: string, errorTranslations?: ErrorTranslations): MealPlan => {
  let cleanedText = text;

  // Step 1: Clean up markdown code blocks first (sometimes models add ```json ... ```)
  cleanedText = cleanedText.replace(/```json/g, "").replace(/```/g, "").trim();

  // Step 2: Strip everything after the last closing brace
  // This removes trailing content like source references that some LLMs append
  const lastBraceIndex = cleanedText.lastIndexOf('}');
  if (lastBraceIndex !== -1) {
    cleanedText = cleanedText.substring(0, lastBraceIndex + 1);
  }

  // Step 3: Strip inline markdown links entirely (some LLMs like Perplexity add these)
  // Pattern: " [text](url)" -> "" (removes the entire markdown link including whitespace)
  // The [^\]\n]+ ensures we don't match across newlines (which would accidentally match JSON array brackets)
  cleanedText = cleanedText.replace(/\s*\[([^\]\n]+)\]\([^)\n]+\)/g, '');

  const errors = errorTranslations ?? translations.English.errors;

  try {
    const parsed = JSON.parse(cleanedText);

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
        errors.tryAgain
      );
    }

    // JSON parsing failed
    console.error("JSON Parse Error. Raw response:", cleanedText);
    throw new Error(errors.invalidJson);
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
  styleWishes: string[] = [],
  errorTranslations?: ErrorTranslations
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
    styleWishes,
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

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
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

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
      if (error.name === 'AbortError') {
        throw new Error(errors.timeout);
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error(errors.networkError);
      }
      // Re-throw with original message if already a user-friendly error
      throw error;
    }

    throw new Error(errors.unexpectedError);
  }
};
