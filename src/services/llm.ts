
export interface Vegetable {
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
  vegetables: Vegetable[],
  people: number
): Promise<MealPlan> => {
  if (!apiKey) throw new Error("API Key is required");

  // Format vegetables for the prompt
  const pantryList = vegetables
    .map((v) => `- ${v.name} (${v.amount}) [ID: ${v.id}]`)
    .join("\n");

  const prompt = `
    You are a smart recipe planner. I have these vegetables in my pantry:
    ${pantryList}

    I need a meal plan for 4 to 5 distinct meals for ${people} people.
    
    RULES:
    1. Prioritize using as many of my pantry vegetables as possible.
    2. Try to use one main vegetable type per recipe if possible, or combine compatible ones.
    3. Keep track of which pantry items (by ID) are used in each recipe.
    4. List any MISSING ingredients I need to buy (protein, spices, other veggies, grains, etc.).
    5. The portion sizes must be realistic for ${people} people.
    6. Return ONLY valid JSON. No markdown formatting, no code blocks.

    JSON Structure:
    {
      "recipes": [
        {
          "id": "unique_id",
          "title": "Recipe Name",
          "time": "30 mins",
          "ingredients": [ {"item": "Name", "amount": "Quantity"} ],
          "instructions": ["Step 1", "Step 2"],
          "usedIngredients": ["vegetable_id_1", "vegetable_id_2"],
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
