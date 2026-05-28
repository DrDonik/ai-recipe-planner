import type { PantryItem, Recipe, Ingredient } from '../types';

const normalize = (s: string | undefined | null): string =>
    (s ?? '').toLowerCase().replace(/[.,/#!$%^&*;:{}=_`~()-]/g, '').replace(/\s+/g, ' ').trim();

/**
 * Reconstructs the slice of pantry a recipe was allocated, so a replacement
 * recipe can be generated against the same budget the discarded one held.
 *
 * `recipe.usedIngredients` lists pantry-item IDs, while the per-recipe amounts
 * live in `recipe.ingredients` keyed by free-text name. We map each ID back to
 * the pantry item and pull the amount the recipe actually used (matched by
 * name, exact first then a looser word-subset match), falling back to the full
 * pantry amount when no confident match is found. IDs whose pantry item no
 * longer exists are dropped.
 */
export const buildMiniPantry = (recipe: Recipe, pantryItems: PantryItem[]): PantryItem[] => {
    // Guard against legacy/shared recipes from localStorage that bypass Zod
    // validation and may lack these fields.
    if (!recipe.usedIngredients) return [];
    return recipe.usedIngredients
        .map((id): PantryItem | null => {
            const pantryItem = pantryItems.find(p => p.id === id);
            if (!pantryItem) return null;
            const name = normalize(pantryItem.name);
            const exact = recipe.ingredients?.find(ing => normalize(ing.item) === name);
            const match = exact ?? recipe.ingredients?.find(ing => {
                const ingName = normalize(ing.item);
                if (!name || !ingName) return false;
                // Word-subset match (one name's words all appear in the other)
                // rather than substring, so "egg" doesn't match "eggplant".
                const nameWords = name.split(' ');
                const ingWords = ingName.split(' ');
                return nameWords.every(w => ingWords.includes(w)) || ingWords.every(w => nameWords.includes(w));
            });
            return { id: pantryItem.id, name: pantryItem.name, amount: match?.amount ?? pantryItem.amount };
        })
        .filter((item): item is PantryItem => item !== null);
};

/**
 * Rebuilds the aggregated shopping list from the recipes' missing ingredients.
 * Items are concatenated without merging duplicates across recipes — a swapped
 * recipe should only ever add or remove its own purchases, leaving the kept
 * recipes' shopping entries (and their checkmarks) untouched.
 */
export const recomputeShoppingList = (recipes: Recipe[]): Ingredient[] =>
    recipes.flatMap(r => r.missingIngredients ?? []);
