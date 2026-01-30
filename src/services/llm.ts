import { z } from 'zod';
import { API_CONFIG } from '../constants';
import type { PantryItem, MealPlan } from '../types';

// Re-export types for backwards compatibility
export type { PantryItem, Ingredient, Recipe, MealPlan, Nutrition } from '../types';

/**
 * Zod schemas for runtime validation of LLM responses.
 * These ensure the parsed JSON matches our expected types.
 */
const IngredientSchema = z.object({
  item: z.string(),
  amount: z.string(),
  unit: z.string().optional(),
});

const NutritionSchema = z.object({
  calories: z.number(),
  carbs: z.number(),
  fat: z.number(),
  protein: z.number(),
});

const RecipeSchema = z.object({
  id: z.string(),
  title: z.string(),
  time: z.string(),
  ingredients: z.array(IngredientSchema),
  instructions: z.array(z.string()),
  usedIngredients: z.array(z.string()),
  missingIngredients: z.array(IngredientSchema),
  nutrition: NutritionSchema.optional(),
});

const MealPlanSchema = z.object({
  recipes: z.array(RecipeSchema),
  shoppingList: z.array(IngredientSchema),
});

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
  styleWishes?: string;
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
  styleWishes = '',
}: RecipePromptParams): string => {
  const pantryList = ingredients
    .map((v) => `- ${v.name} (${v.amount}) [ID: ${v.id}]`)
    .join("\n");

  const spiceList = spices.length > 0
    ? `Available Spices/Staples (Do NOT add to shopping list): ${spices.join(", ")}`
    : "No extra spices available.";

  const styleWishesText = styleWishes.trim()
    ? `STYLE/WISHES: ${styleWishes}`
    : "";

  return `
    You are a smart recipe planner. 

    I need a meal plan for ${meals} distinct meals for ${people} people.

    ${ingredients.length > 0 ? `I have these ingredients in my pantry:\n${pantryList}` : `My pantry is empty. Choose suitable ingredients for the recipes.`}

    ${spiceList}

    DIETARY PREFERENCE: ${diet}
    LANGUAGE: ${language}
    ${styleWishesText}
    
    RULES:
    1. STRICTLY follow the dietary preference: ${diet}.${styleWishes.trim() ? ` Also respect the style/wishes: ${styleWishes}. This should guide the cuisine type, dietary restrictions, or cooking style preferences.` : ''}
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
          "nutrition": {"calories": 450, "carbs": 35, "fat": 18, "protein": 28}
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
export const parseRecipeResponse = (text: string): MealPlan => {
  // Clean up markdown block if present (sometimes models add ```json ... ```)
  const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(cleanedText);

    // Validate the parsed data against our schema
    const validated = MealPlanSchema.parse(parsed);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Zod validation failed - the JSON structure doesn't match expectations
      console.error("Validation Error:", error.errors);
      const firstError = error.errors[0];
      const path = firstError.path.join('.');
      throw new Error(
        `Invalid recipe data structure: ${firstError.message}${path ? ` at ${path}` : ''}. ` +
        `Please try generating recipes again.`
      );
    }

    // JSON parsing failed
    console.error("JSON Parse Error. Raw response:", cleanedText);
    throw new Error("Failed to parse recipe data. The AI returned invalid JSON.");
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
  styleWishes: string = ''
): Promise<MealPlan> => {
  if (!apiKey) throw new Error("API Key is required");

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
      throw new Error(errorData.error?.message || "Failed to fetch recipes");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("No recipes generated. The AI returned an empty response.");

    return parseRecipeResponse(text);
  } catch (error) {
    console.error("LLM Error:", error);

    // Handle specific error types with user-friendly messages
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error("Request timed out. Please try again.");
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error("Network error. Please check your internet connection.");
      }
      // Re-throw with original message if already a user-friendly error
      throw error;
    }

    throw new Error("An unexpected error occurred. Please try again.");
  }
};
