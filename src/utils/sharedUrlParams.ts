import { z } from 'zod';
import { decodeFromUrl, decodeLegacyFromUrl } from './sharing';
import { RecipeSchema, IngredientSchema } from '../services/llm';
import { URL_PARAMS } from '../constants';
import type { Recipe, Ingredient } from '../types';

interface SharedUrlData {
    recipe: Recipe | null;
    shoppingList: Ingredient[] | null;
    hasInvalidData: boolean;
}

// undefined: neither parameter is present; null: one is, but does not decode.
// The compressed parameter wins over the legacy one.
function decodeSharedParam<T>(
    searchParams: URLSearchParams,
    param: string,
    legacyParam: string,
    schema: z.ZodSchema<T>,
): T | null | undefined {
    const payload = searchParams.get(param);
    if (payload) return decodeFromUrl(payload, schema);
    const legacyPayload = searchParams.get(legacyParam);
    if (legacyPayload) return decodeLegacyFromUrl(legacyPayload, schema);
    return undefined;
}

// Parse shared-link URL params once. Pure (no React deps) so it can feed
// lazy useState initializers, avoiding a setState-in-effect on mount.
// A recipe takes precedence when both a recipe and a shopping list are present.
export function parseSharedUrlParams(): SharedUrlData {
    const searchParams = new URLSearchParams(window.location.search);

    const recipe = decodeSharedParam<Recipe>(searchParams, URL_PARAMS.RECIPE, URL_PARAMS.LEGACY_RECIPE, RecipeSchema);
    if (recipe !== undefined) {
        return { recipe, shoppingList: null, hasInvalidData: !recipe };
    }
    const shoppingList = decodeSharedParam<Ingredient[]>(
        searchParams, URL_PARAMS.SHOPPING_LIST, URL_PARAMS.LEGACY_SHOPPING_LIST, z.array(IngredientSchema),
    );
    if (shoppingList !== undefined) {
        return { recipe: null, shoppingList, hasInvalidData: !shoppingList };
    }
    return { recipe: null, shoppingList: null, hasInvalidData: false };
}
