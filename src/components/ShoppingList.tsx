
import React from 'react';
import { ShoppingCart } from 'lucide-react';
import type { Ingredient } from '../services/llm';
import { translations } from '../constants/translations';

interface ShoppingListProps {
    items: Ingredient[];
    language: string;
}

export const ShoppingList: React.FC<ShoppingListProps> = ({ items, language }) => {
    const t = translations[language as keyof typeof translations];

    if (items.length === 0) return null;

    return (
        <div className="glass-panel p-6">
            <div className="flex items-center gap-3 mb-5">
                <ShoppingCart className="text-[var(--color-secondary)]" size={24} />
                <h2>{t.shoppingList}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/40 dark:bg-black/20 rounded-lg border border-[var(--color-border)]" style={{ padding: '1rem' }}>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" className="w-5 h-5 accent-[var(--color-primary)] rounded cursor-pointer" />
                            <span className="font-medium">{item.item}</span>
                        </div>
                        <span className="text-sm text-[var(--color-text-muted)] bg-white/50 dark:bg-black/30 rounded text-right" style={{ padding: '0.25rem 0.75rem' }}>
                            {item.amount}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
