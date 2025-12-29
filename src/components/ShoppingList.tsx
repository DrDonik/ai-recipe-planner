
import React from 'react';
import { ShoppingCart } from 'lucide-react';
import type { Ingredient } from '../services/llm';

interface ShoppingListProps {
    items: Ingredient[];
}

export const ShoppingList: React.FC<ShoppingListProps> = ({ items }) => {
    if (items.length === 0) return null;

    return (
        <div className="glass-panel p-6">
            <div className="flex items-center gap-3 mb-4">
                <ShoppingCart className="text-[var(--color-secondary)]" size={24} />
                <h2>Shopping List</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 rounded-lg border border-[var(--glass-border)]">
                        <div className="flex items-center gap-3">
                            <input type="checkbox" className="w-5 h-5 accent-[var(--color-primary)] rounded cursor-pointer" />
                            <span className="font-medium">{item.item}</span>
                        </div>
                        <span className="text-sm text-[var(--color-text-muted)] bg-white/50 dark:bg-black/30 px-2 py-0.5 rounded text-right">
                            {item.amount}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
