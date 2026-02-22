import type { Ingredient } from '../types';

/**
 * Generate a unique key for an ingredient (for checkbox state tracking).
 */
export const getItemKey = (item: Ingredient) => `${item.item}|${item.amount}`;

/**
 * Check if two shopping lists contain the same items (ignoring checked state).
 */
export const listsMatch = (a: Ingredient[], b: Ingredient[]): boolean => {
    if (a.length !== b.length) return false;
    const aKeys = new Set(a.map(getItemKey));
    return b.every(item => aKeys.has(getItemKey(item)));
};
