import type { Ingredient } from '../types';

/**
 * Generate a unique key for an ingredient (for checkbox state tracking).
 */
export const getItemKey = (item: Ingredient) => `${item.item}|${item.amount}`;

/**
 * Generate a hash for a list of items (for localStorage key).
 * Simple hash based on sorted item keys.
 */
export const getListHash = (items: Ingredient[]): string => {
    const keys = items.map(getItemKey).sort().join('|');
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < keys.length; i++) {
        const char = keys.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `shopping_list_shared_${Math.abs(hash).toString(36)}`;
};

/**
 * Check if two shopping lists contain the same items (ignoring checked state).
 */
export const listsMatch = (a: Ingredient[], b: Ingredient[]): boolean => {
    if (a.length !== b.length) return false;
    const aKeys = new Set(a.map(getItemKey));
    return b.every(item => aKeys.has(getItemKey(item)));
};
