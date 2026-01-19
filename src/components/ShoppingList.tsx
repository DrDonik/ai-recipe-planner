import React, { useMemo, useCallback } from 'react';
import { ShoppingCart, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import type { Ingredient } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { generateShareUrl } from '../utils/sharing';
import { useSettings } from '../contexts/SettingsContext';
import { STORAGE_KEYS, URL_PARAMS } from '../constants';

interface ShoppingListProps {
    items: Ingredient[];
    isMinimized?: boolean;
    onToggleMinimize?: () => void;
    isStandaloneView?: boolean;
}

export const ShoppingList: React.FC<ShoppingListProps> = ({ items, isMinimized = false, onToggleMinimize, isStandaloneView = false }) => {
    const { t } = useSettings();

    // Load checked items from localStorage
    const [checkedItemsList, setCheckedItemsList] = useLocalStorage<string[]>(STORAGE_KEYS.SHOPPING_LIST_CHECKED, []);

    // Memoize the Set to avoid recreation on every render
    const checkedItems = useMemo(() => new Set(checkedItemsList), [checkedItemsList]);

    // Generate a unique key for each item (using item name + amount)
    const getItemKey = useCallback((item: Ingredient) => `${item.item}|${item.amount}`, []);

    const toggleItem = useCallback((itemKey: string) => {
        setCheckedItemsList(prev => {
            const nextSet = new Set(prev);
            if (nextSet.has(itemKey)) {
                nextSet.delete(itemKey);
            } else {
                nextSet.add(itemKey);
            }
            return Array.from(nextSet);
        });
    }, [setCheckedItemsList]);

    // Memoize the share URL to avoid regeneration on every render
    const shareUrl = useMemo(() => generateShareUrl(URL_PARAMS.SHOPPING_LIST, items), [items]);

    if (items.length === 0) return null;

    return (
        <div className={`glass-panel ${isMinimized ? 'p-6 pb-6' : 'p-6'}`}>
            <div className={`flex items-center justify-between ${isMinimized ? 'mb-0' : 'mb-5'}`}>
                <div className="flex items-center gap-3">
                    <ShoppingCart className="text-secondary" size={24} />
                    <h2>{t.shoppingList}</h2>
                </div>
                <div className="flex gap-2">
                    {!isStandaloneView && (
                        <div className="tooltip-container">
                            <a
                                href={shareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors focus:opacity-100 flex items-center justify-center text-text-muted hover:text-primary"
                                aria-label={t.openInNewTab}
                            >
                                <ExternalLink size={18} />
                            </a>
                            <div className="tooltip-text">
                                {t.openInNewTab}
                            </div>
                        </div>
                    )}
                    {onToggleMinimize && (
                        <button
                            onClick={onToggleMinimize}
                            className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors focus:opacity-100 flex items-center justify-center text-text-muted hover:text-primary"
                            aria-label={isMinimized ? 'Expand' : 'Collapse'}
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
                            <li key={`${itemKey}-${i}`} className="flex items-center justify-between bg-white/40 dark:bg-black/20 rounded-lg border border-border-base hover:border-border-hover transition-colors p-4 shadow-sm">
                                <label htmlFor={checkboxId} className="flex items-center gap-3 cursor-pointer flex-1">
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
        </div>
    );
};
