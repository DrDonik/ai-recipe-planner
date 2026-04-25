import { describe, it, expect, beforeEach } from 'vitest';
import { parseSharedUrlParams } from '../../utils/sharedUrlParams';
import { encodeForUrl } from '../../utils/sharing';
import type { Recipe, Ingredient } from '../../types';

const mockLocation = new URL('http://localhost:3000');
Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true,
    configurable: true,
});

const validRecipe: Recipe = {
    id: 'r1',
    title: 'Tomato Soup',
    time: '20 min',
    ingredients: [{ item: 'Tomato', amount: '4', unit: 'pcs' }],
    instructions: ['Simmer'],
    usedIngredients: [],
    missingIngredients: [],
};

const validShoppingList: Ingredient[] = [
    { item: 'Milk', amount: '1', unit: 'L' },
    { item: 'Bread', amount: '1', unit: 'loaf' },
];

describe('parseSharedUrlParams', () => {
    beforeEach(() => {
        mockLocation.search = '';
    });

    it('returns all-null when no URL params are present', () => {
        const result = parseSharedUrlParams();
        expect(result).toEqual({
            recipe: null,
            shoppingList: null,
            hasInvalidData: false,
        });
    });

    it('decodes a valid ?recipe= param into the recipe field', () => {
        const encoded = encodeForUrl(validRecipe);
        mockLocation.search = `?recipe=${encodeURIComponent(encoded)}`;

        const result = parseSharedUrlParams();

        expect(result.recipe).toEqual(validRecipe);
        expect(result.shoppingList).toBeNull();
        expect(result.hasInvalidData).toBe(false);
    });

    it('flags hasInvalidData when ?recipe= contains invalid base64', () => {
        mockLocation.search = '?recipe=invalid-base64-data';

        const result = parseSharedUrlParams();

        expect(result.recipe).toBeNull();
        expect(result.shoppingList).toBeNull();
        expect(result.hasInvalidData).toBe(true);
    });

    it('flags hasInvalidData when ?recipe= decodes to an object that fails schema validation', () => {
        const encoded = encodeForUrl({ not: 'a recipe' });
        mockLocation.search = `?recipe=${encodeURIComponent(encoded)}`;

        const result = parseSharedUrlParams();

        expect(result.recipe).toBeNull();
        expect(result.hasInvalidData).toBe(true);
    });

    it('decodes a valid ?shoppingList= param into the shoppingList field', () => {
        const encoded = encodeForUrl(validShoppingList);
        mockLocation.search = `?shoppingList=${encodeURIComponent(encoded)}`;

        const result = parseSharedUrlParams();

        expect(result.recipe).toBeNull();
        expect(result.shoppingList).toEqual(validShoppingList);
        expect(result.hasInvalidData).toBe(false);
    });

    it('flags hasInvalidData when ?shoppingList= contains invalid base64', () => {
        mockLocation.search = '?shoppingList=invalid-base64-data';

        const result = parseSharedUrlParams();

        expect(result.recipe).toBeNull();
        expect(result.shoppingList).toBeNull();
        expect(result.hasInvalidData).toBe(true);
    });

    it('flags hasInvalidData when ?shoppingList= decodes to data that fails schema validation', () => {
        const encoded = encodeForUrl({ not: 'an array' });
        mockLocation.search = `?shoppingList=${encodeURIComponent(encoded)}`;

        const result = parseSharedUrlParams();

        expect(result.shoppingList).toBeNull();
        expect(result.hasInvalidData).toBe(true);
    });

    it('prefers ?recipe= over ?shoppingList= when both are present (recipe branch wins)', () => {
        const encodedRecipe = encodeForUrl(validRecipe);
        const encodedList = encodeForUrl(validShoppingList);
        mockLocation.search =
            `?recipe=${encodeURIComponent(encodedRecipe)}` +
            `&shoppingList=${encodeURIComponent(encodedList)}`;

        const result = parseSharedUrlParams();

        expect(result.recipe).toEqual(validRecipe);
        expect(result.shoppingList).toBeNull();
        expect(result.hasInvalidData).toBe(false);
    });

    it('returns hasInvalidData when ?recipe= is invalid even if ?shoppingList= would be valid', () => {
        const encodedList = encodeForUrl(validShoppingList);
        mockLocation.search =
            '?recipe=invalid-base64-data' +
            `&shoppingList=${encodeURIComponent(encodedList)}`;

        const result = parseSharedUrlParams();

        expect(result.recipe).toBeNull();
        expect(result.shoppingList).toBeNull();
        expect(result.hasInvalidData).toBe(true);
    });
});
