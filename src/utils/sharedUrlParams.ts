import { z } from 'zod';
import { decodeFromUrl } from './sharing';
import { RecipeSchema, IngredientSchema } from '../services/llm';
import { URL_PARAMS } from '../constants';
import type { Recipe, Ingredient } from '../types';

export interface SharedUrlData {
    recipe: Recipe | null;
    shoppingList: Ingredient[] | null;
    hasInvalidData: boolean;
}

// Parse shared-link URL params once. Pure (no React deps) so it can feed
// lazy useState initializers, avoiding a setState-in-effect on mount.
// `recipe` takes precedence when both params are present.
export function parseSharedUrlParams(): SharedUrlData {
    const searchParams = new URLSearchParams(window.location.search);
    const recipeParam = searchParams.get(URL_PARAMS.RECIPE);
    const shoppingListParam = searchParams.get(URL_PARAMS.SHOPPING_LIST);

    if (recipeParam) {
        const decoded = decodeFromUrl<Recipe>(decodeURIComponent(recipeParam), RecipeSchema);
        return { recipe: decoded, shoppingList: null, hasInvalidData: !decoded };
    }
    if (shoppingListParam) {
        const decoded = decodeFromUrl<Ingredient[]>(decodeURIComponent(shoppingListParam), z.array(IngredientSchema));
        return { recipe: null, shoppingList: decoded, hasInvalidData: !decoded };
    }
    return { recipe: null, shoppingList: null, hasInvalidData: false };
}
