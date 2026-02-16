import React, { useMemo, useCallback, useState } from 'react';
import { ShoppingCart, ExternalLink, ChevronUp, ChevronDown, Info, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Ingredient, MealPlan } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useSettings } from '../contexts/SettingsContext';
import { STORAGE_KEYS } from '../constants';

interface ShoppingListProps {
    items: Ingredient[];
    isMinimized?: boolean;
    onToggleMinimize?: () => void;
    isStandaloneView?: boolean;
    onViewSingle?: () => void;
    onClose?: () => void;
}

/**
 * Generate a unique key for an ingredient (for checkbox state tracking).
 */
const getItemKey = (item: Ingredient) => `${item.item}|${item.amount}`;

/**
 * Check if two shopping lists contain the same items (ignoring checked state).
 */
const listsMatch = (a: Ingredient[], b: Ingredient[]): boolean => {
    if (a.length !== b.length) return false;
    const aKeys = new Set(a.map(getItemKey));
    return b.every(item => aKeys.has(getItemKey(item)));
};

/**
 * Generate a hash for a list of items (for localStorage key).
 * Simple hash based on sorted item keys.
 */
const getListHash = (items: Ingredient[]): string => {
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

export const ShoppingList: React.FC<ShoppingListProps> = ({ items, isMinimized = false, onToggleMinimize, isStandaloneView = false, onViewSingle, onClose }) => {
    const { t } = useSettings();

    // Load checked items from localStorage (used for main view and own list in standalone)
    const [localStorageChecked, setLocalStorageChecked] = useLocalStorage<string[]>(STORAGE_KEYS.SHOPPING_LIST_CHECKED, []);

    // Determine if this is the user's own list and get initial checked state
    // Consolidates duplicate localStorage parsing and listsMatch calls
    const { isOwnList, ownListCheckedState } = useMemo(() => {
        if (!isStandaloneView) return { isOwnList: false, ownListCheckedState: null };
        const storedPlanJson = localStorage.getItem(STORAGE_KEYS.MEAL_PLAN);
        if (!storedPlanJson) return { isOwnList: false, ownListCheckedState: null };
        try {
            const storedPlan = JSON.parse(storedPlanJson) as MealPlan;
            if (!storedPlan?.shoppingList) return { isOwnList: false, ownListCheckedState: null };
            const match = listsMatch(items, storedPlan.shoppingList);
            if (!match) return { isOwnList: false, ownListCheckedState: null };
            // This is the user's own list - load their checked state
            const checkedJson = localStorage.getItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED);
            const checked = checkedJson ? JSON.parse(checkedJson) as string[] : null;
            return { isOwnList: true, ownListCheckedState: checked };
        } catch {
            return { isOwnList: false, ownListCheckedState: null };
        }
    }, [isStandaloneView, items]);

    // Get the localStorage key for shared lists (based on content hash)
    const sharedListStorageKey = useMemo(() => getListHash(items), [items]);

    // For standalone view: track checked state locally, initialized from localStorage
    const [standaloneChecked, setStandaloneChecked] = useState<Set<string>>(() => {
        if (!isStandaloneView) return new Set();

        // Own list: use the checked state from the consolidated computation
        if (isOwnList) {
            return new Set(ownListCheckedState ?? []);
        }

        // Shared list: use hashed localStorage key
        const storedSharedChecked = localStorage.getItem(sharedListStorageKey);
        if (storedSharedChecked) {
            try {
                return new Set(JSON.parse(storedSharedChecked) as string[]);
            } catch {
                // Fall through to empty state
            }
        }

        return new Set();
    });

    // Get the set of valid item keys for the current list
    const validItemKeys = useMemo(() => new Set(items.map(getItemKey)), [items]);

    // Get the current checked items based on view mode
    // Filter to only include items that exist in the current list
    const checkedItems = useMemo(() => {
        if (isStandaloneView) {
            return standaloneChecked;
        }
        // Main view: filter localStorage to only items in current list
        // This handles stale checked items from previous meal plans
        return new Set(localStorageChecked.filter(key => validItemKeys.has(key)));
    }, [isStandaloneView, standaloneChecked, localStorageChecked, validItemKeys]);

    const toggleItem = useCallback((itemKey: string) => {
        if (isStandaloneView) {
            // Update standalone state and persist to appropriate localStorage key
            setStandaloneChecked(prev => {
                const next = new Set(prev);
                if (next.has(itemKey)) {
                    next.delete(itemKey);
                } else {
                    next.add(itemKey);
                }

                // Persist to localStorage
                if (isOwnList) {
                    // Own list: use main localStorage key (via hook)
                    setLocalStorageChecked(Array.from(next));
                } else {
                    // Shared list: use hashed localStorage key
                    localStorage.setItem(sharedListStorageKey, JSON.stringify(Array.from(next)));
                }

                return next;
            });
        } else {
            // Main app view: just update localStorage
            setLocalStorageChecked(prev => {
                const nextSet = new Set(prev);
                if (nextSet.has(itemKey)) {
                    nextSet.delete(itemKey);
                } else {
                    nextSet.add(itemKey);
                }
                return Array.from(nextSet);
            });
        }
    }, [isStandaloneView, isOwnList, setLocalStorageChecked, sharedListStorageKey]);


    if (items.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            className={`glass-panel ${isMinimized ? 'p-6 pb-6' : 'p-6'}`}
        >
            <div className={`flex items-center justify-between ${isMinimized ? 'mb-0' : 'mb-5'}`}>
                <div className="flex items-center gap-3">
                    <ShoppingCart className="text-secondary" size={24} />
                    <h2>{t.shoppingList}</h2>
                </div>
                {isStandaloneView && !isOwnList && (
                    <div className="flex items-center gap-2 ml-auto mr-4">
                        <span className="text-text-muted text-sm italic">{t.decoupled}</span>
                        <div className="tooltip-container">
                            <span
                                className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors text-text-muted hover:text-primary flex items-center justify-center"
                                aria-label={t.decoupledInfo}
                                role="img"
                            >
                                <Info size={18} />
                            </span>
                            <div className="tooltip-text">
                                {t.decoupledInfo}
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex gap-2">
                    {!isStandaloneView && onViewSingle && (
                        <button
                            onClick={onViewSingle}
                            className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors focus:opacity-100 flex items-center justify-center text-text-muted hover:text-primary"
                            aria-label={t.openInNewTab}
                        >
                            <ExternalLink size={18} />
                        </button>
                    )}
                    {isStandaloneView && onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/50 hover:bg-white/50 dark:bg-black/20 dark:hover:bg-black/30  rounded-full transition-colors text-text-muted hover:text-text-base focus:outline-none focus:ring-2 focus:ring-primary"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                    )}
                    {onToggleMinimize && (
                        <button
                            onClick={onToggleMinimize}
                            className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors focus:opacity-100 flex items-center justify-center text-text-muted hover:text-primary"
                            aria-label={isMinimized ? 'Expand' : 'Collapse'}
                            aria-expanded={!isMinimized}
                        >
                            {isMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </button>
                    )}
                </div>
            </div>

            {!isMinimized && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 list-none p-0 m-0" role="list">
                    {items.map((item, i) => {
                        const itemKey = getItemKey(item);
                        const isChecked = checkedItems.has(itemKey);
                        const checkboxId = `shopping-item-${i}`;
                        return (
                            <li
                                key={`${itemKey}-${i}`}
                                className="flex items-center justify-between bg-white/40 dark:bg-black/20 rounded-lg border border-border-base hover:border-border-hover transition-colors p-3 shadow-sm cursor-pointer"
                                onClick={(e) => {
                                    // Avoid double-toggle when clicking the checkbox directly
                                    if ((e.target as HTMLElement).tagName !== 'INPUT') {
                                        toggleItem(itemKey);
                                    }
                                }}
                            >
                                <label htmlFor={checkboxId} className="flex items-center gap-3 cursor-pointer flex-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        id={checkboxId}
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleItem(itemKey)}
                                        className="w-5 h-5 accent-primary rounded cursor-pointer"
                                    />
                                    <span className={`font-medium ${isChecked ? 'line-through text-text-muted' : ''}`}>{item.item}</span>
                                </label>
                                <span className="text-sm text-text-muted bg-white/50 dark:bg-black/30 rounded text-right px-3 py-1">
                                    {item.amount}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </motion.div>
    );
};
