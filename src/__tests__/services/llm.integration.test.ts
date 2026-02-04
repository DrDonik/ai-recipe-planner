import { describe, it, expect, beforeAll } from 'vitest';
import { generateRecipes } from '@/services/llm';
import type { PantryItem } from '@/types';

const SKIP_INTEGRATION = !process.env.GEMINI_API_KEY;

describe.skipIf(SKIP_INTEGRATION)('LLM Service - Integration Tests (Real API)', () => {
  beforeAll(() => {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('Skipping integration tests: Set GEMINI_API_KEY to run these tests');
    }
  });

  const testIngredients: PantryItem[] = [
    { id: 'id1', name: 'Tomatoes', amount: '500g' },
    { id: 'id2', name: 'Pasta', amount: '250g' },
    { id: 'id3', name: 'Garlic', amount: '3 cloves' },
  ];

  it('should generate valid recipes from real Gemini API', async () => {
    const result = await generateRecipes(
      process.env.GEMINI_API_KEY!,
      testIngredients,
      2, // people
      1, // meals
      'Vegetarian',
      'English'
    );

    // Validate response structure
    expect(result).toHaveProperty('recipes');
    expect(result).toHaveProperty('shoppingList');
    expect(Array.isArray(result.recipes)).toBe(true);
    expect(Array.isArray(result.shoppingList)).toBe(true);

    // Validate recipe contents
    expect(result.recipes.length).toBeGreaterThan(0);
    const recipe = result.recipes[0];
    expect(recipe).toHaveProperty('id');
    expect(recipe).toHaveProperty('title');
    expect(recipe).toHaveProperty('time');
    expect(recipe).toHaveProperty('ingredients');
    expect(recipe).toHaveProperty('instructions');
    expect(recipe).toHaveProperty('usedIngredients');
    expect(recipe).toHaveProperty('missingIngredients');

    // Validate arrays are non-empty
    expect(recipe.ingredients.length).toBeGreaterThan(0);
    expect(recipe.instructions.length).toBeGreaterThan(0);

    // Validate usedIngredients references real pantry IDs
    expect(recipe.usedIngredients.every((id: string) =>
      testIngredients.some(item => item.id === id)
    )).toBe(true);
  }, 60000); // 60 second timeout for API call

  it('should handle invalid API key gracefully', async () => {
    await expect(
      generateRecipes(
        'invalid-api-key-12345',
        testIngredients,
        2,
        1,
        'Vegetarian',
        'English'
      )
    ).rejects.toThrow();
  }, 60000);

  it('should handle empty pantry gracefully', async () => {
    const result = await generateRecipes(
      process.env.GEMINI_API_KEY!,
      [], // empty pantry
      2,
      1,
      'Vegetarian',
      'English'
    );

    // Should still return valid structure even with no ingredients
    expect(result).toHaveProperty('recipes');
    expect(result).toHaveProperty('shoppingList');
    expect(Array.isArray(result.recipes)).toBe(true);
    expect(Array.isArray(result.shoppingList)).toBe(true);
  }, 60000);
});
