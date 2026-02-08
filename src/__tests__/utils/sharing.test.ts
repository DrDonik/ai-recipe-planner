import { describe, it, expect } from 'vitest';
import { encodeForUrl, decodeFromUrl, generateShareUrl } from '../../utils/sharing';
import { z } from 'zod';

// Sample test schema
const TestSchema = z.object({
  name: z.string(),
  value: z.number(),
});

type TestData = z.infer<typeof TestSchema>;

describe('sharing utilities', () => {
  describe('encodeForUrl and decodeFromUrl', () => {
    it('should encode and decode simple objects', () => {
      const data = { name: 'Test Recipe', value: 42 };

      const encoded = encodeForUrl(data);
      const decoded = decodeFromUrl<typeof data>(encoded);

      expect(decoded).toEqual(data);
    });

    it('should handle UTF-8 characters (emoji, umlauts)', () => {
      const data = {
        name: 'Schnitzel mit Spätzle 🍖',
        description: 'Délicieux! 美味しい',
      };

      const encoded = encodeForUrl(data);
      const decoded = decodeFromUrl<typeof data>(encoded);

      expect(decoded).toEqual(data);
    });

    it('should handle complex nested objects', () => {
      const data = {
        recipes: [
          { id: '1', title: 'Recipe 1', ingredients: ['a', 'b'] },
          { id: '2', title: 'Recipe 2', ingredients: ['c', 'd'] },
        ],
        shoppingList: [{ item: 'Milk', amount: '1L' }],
      };

      const encoded = encodeForUrl(data);
      const decoded = decodeFromUrl<typeof data>(encoded);

      expect(decoded).toEqual(data);
    });

    it('should validate data with Zod schema when provided', () => {
      const validData: TestData = { name: 'test', value: 123 };
      const encoded = encodeForUrl(validData);

      const decoded = decodeFromUrl(encoded, TestSchema);

      expect(decoded).toEqual(validData);
    });

    it('should return null for invalid data when schema validation fails', () => {
      const invalidData = { name: 'test', value: 'not a number' };
      const encoded = encodeForUrl(invalidData);

      const decoded = decodeFromUrl(encoded, TestSchema);

      expect(decoded).toBeNull();
    });

    it('should return null for corrupted base64', () => {
      const corrupted = 'not-valid-base64!!!';

      const decoded = decodeFromUrl<TestData>(corrupted);

      expect(decoded).toBeNull();
    });

    it('should handle large objects without issues', () => {
      // Create a large recipe object
      const largeData = {
        recipes: Array.from({ length: 10 }, (_, i) => ({
          id: `recipe-${i}`,
          title: `Recipe ${i} with a very long name that contains lots of text`,
          ingredients: Array.from({ length: 20 }, (_, j) => ({
            item: `Ingredient ${j}`,
            amount: `${j * 100}g`,
          })),
          instructions: Array.from({ length: 15 }, (_, k) =>
            `Step ${k + 1}: This is a detailed instruction with lots of text explaining what to do.`
          ),
        })),
      };

      const encoded = encodeForUrl(largeData);
      const decoded = decodeFromUrl<typeof largeData>(encoded);

      expect(decoded).toEqual(largeData);
    });

    it('should handle empty objects', () => {
      const data = {};

      const encoded = encodeForUrl(data);
      const decoded = decodeFromUrl<typeof data>(encoded);

      expect(decoded).toEqual(data);
    });

    it('should handle arrays', () => {
      const data = ['item1', 'item2', 'item3'];

      const encoded = encodeForUrl(data);
      const decoded = decodeFromUrl<typeof data>(encoded);

      expect(decoded).toEqual(data);
    });
  });

  describe('generateShareUrl', () => {
    it('should generate a valid URL with encoded parameter', () => {
      const data = { name: 'Test Recipe' };

      const url = generateShareUrl('recipe', data);

      expect(url).toContain('?recipe=');
      expect(() => new URL(url)).not.toThrow();
    });

    it('should encode special characters in the parameter value', () => {
      const data = { name: 'Test+Recipe with spaces' };

      const url = generateShareUrl('recipe', data);
      const parsedUrl = new URL(url);
      const paramValue = parsedUrl.searchParams.get('recipe');

      expect(paramValue).toBeTruthy();
      // The + from base64 should be encoded
      expect(url).not.toContain('?recipe=+');
    });

    it('should use current origin and pathname', () => {
      const data = { test: 'data' };

      const url = generateShareUrl('recipe', data);
      const parsedUrl = new URL(url);

      expect(parsedUrl.origin).toBe(window.location.origin);
      expect(parsedUrl.pathname).toBe(window.location.pathname);
    });

    it('should preserve all recipe fields including missingIngredients', () => {
      const recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        time: '30 min',
        ingredients: [{ item: 'Tomato', amount: '2' }],
        instructions: ['Step 1'],
        usedIngredients: ['ingredient-1'],
        missingIngredients: [{ item: 'Salt', amount: '1 tsp' }],
      };

      const url = generateShareUrl('recipe', recipe);
      const parsedUrl = new URL(url);
      const paramValue = parsedUrl.searchParams.get('recipe');

      expect(paramValue).toBeTruthy();
      const decoded = decodeFromUrl<typeof recipe>(decodeURIComponent(paramValue!));

      expect(decoded).toEqual(recipe);
      expect(decoded?.missingIngredients).toEqual([{ item: 'Salt', amount: '1 tsp' }]);
    });
  });
});
