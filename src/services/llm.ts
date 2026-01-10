
export interface PantryItem {
  id: string;
  name: string;
  amount: string;
}

export interface Ingredient {
  item: string;
  amount: string;
  unit?: string;
}

export interface Recipe {
  id: string;
  title: string;
  time: string;
  ingredients: Ingredient[];
  instructions: string[];
  usedIngredients: string[]; // List of vegetable IDs used
  missingIngredients: Ingredient[];
}

export interface MealPlan {
  recipes: Recipe[];
  shoppingList: Ingredient[];
}

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

  // Format ingredients for the prompt
  const pantryList = ingredients
    .map((v) => `- ${v.name} (${v.amount}) [ID: ${v.id}]`)
    .join("\n");

  const spiceList = spices.length > 0
    ? `Available Spices/Staples (Do NOT add to shopping list): ${spices.join(", ")}`
    : "No extra spices available.";

  const styleWishesText = styleWishes.trim()
    ? `STYLE/WISHES: ${styleWishes}`
    : "";

  const prompt = `
    You are a smart recipe planner. I have these ingredients in my pantry:
    ${pantryList}

    ${spiceList}

    I need a meal plan for ${meals} distinct meals for ${people} people.

    DIETARY PREFERENCE: ${diet}
    LANGUAGE: ${language}
    ${styleWishesText}
    
    RULES:
    1. STRICTLY follow the dietary preference: ${diet}.${styleWishes.trim() ? ` Also respect the style/wishes: ${styleWishes}. This should guide the cuisine type, dietary restrictions, or cooking style preferences.` : ''}
    2. Output ALL text (recipe titles, ingredients, instructions, shopping list items) in ${language}.
    3. The "ingredients" array must contain EVERY single ingredient needed for the recipe (both what I have and what I need to buy).
    4. The "missingIngredients" array must ONLY contain items I need to buy. DO NOT include spices if they are listed in "Available Spices".
    5. The "item" field MUST NOT include the "amount". Keep them separate. Example: {"item": "Carrots", "amount": "500g"}, NOT {"item": "Carrots 500g"}.
    6. Ensure "missingIngredients" is a list of distinct objects, not one combined string.
    7. Prioritize using as many of my pantry ingredients as possible.
    8. If there are too few ingredients to generate ${meals} meals for ${people} people, do not stretch the same few ingredients across all meals if it results in repetitive or poor-quality recipes.
    9. If I have too few ingredients for the requested amount of meals, supplement with additional ingredients from your own knowledge and add them to the "missingIngredients" array.
    10. Let the available spices guide the recipes. Not all spices need to be used.
    11. If you need to buy spices, use the "missingIngredients" array.
    12. The portion sizes must be realistic for ${people} people.
    13. Ensure variety: The ${meals} meals should be distinct in style and flavor profile.
    14. Return ONLY valid JSON. No markdown formatting, no code blocks.

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
          "missingIngredients": [{"item": "Chicken", "amount": "500g"}]
        }
      ],
      "shoppingList": [
        {"item": "Chicken", "amount": "500g (Total for all recipes)"}
      ]
    }
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
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
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to fetch recipes");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("No recipes generated");

    // Clean up markdown block if present (sometimes models add ```json ... ```)
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

    return JSON.parse(cleanedText) as MealPlan;
  } catch (error) {
    console.error("LLM Error:", error);
    throw error;
  }
};
