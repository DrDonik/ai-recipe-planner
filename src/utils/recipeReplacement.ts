import type { PantryItem, Recipe, Ingredient } from '../types';

const normalize = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Reconstructs the slice of pantry a recipe was allocated, so a replacement
 * recipe can be generated against the same budget the discarded one held.
 *
 * `recipe.usedIngredients` lists pantry-item IDs, while the per-recipe amounts
 * live in `recipe.ingredients` keyed by free-text name. We map each ID back to
 * the pantry item and pull the amount the recipe actually used (matched by
 * name, exact first then a looser contains-match), falling back to the full
 * pantry amount when no confident match is found. IDs whose pantry item no
 * longer exists are dropped.
 */
export const buildMiniPantry = (recipe: Recipe, pantryItems: PantryItem[]): PantryItem[] => {
    return recipe.usedIngredients
        .map((id): PantryItem | null => {
            const pantryItem = pantryItems.find(p => p.id === id);
            if (!pantryItem) return null;
            const name = normalize(pantryItem.name);
            const exact = recipe.ingredients.find(ing => normalize(ing.item) === name);
            const match = exact ?? recipe.ingredients.find(ing => {
                const ingName = normalize(ing.item);
                return ingName.includes(name) || name.includes(ingName);
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
