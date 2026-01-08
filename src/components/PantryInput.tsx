
import React, { useState } from 'react';
import { Plus, Trash2, Refrigerator } from 'lucide-react';
import type { PantryItem } from '../services/llm';
import { translations } from '../constants/translations';

import { generateId } from '../utils/idGenerator';

interface PantryInputProps {
    pantryItems: PantryItem[];
    onAddPantryItem: (item: PantryItem) => void;
    onRemovePantryItem: (id: string) => void;
    language: string;
}

export const PantryInput: React.FC<PantryInputProps> = ({
    pantryItems,
    onAddPantryItem,
    onRemovePantryItem,
    language
}) => {
    const t = translations[language as keyof typeof translations];
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !amount.trim()) return;

        onAddPantryItem({
            id: generateId(),
            name: name.trim(),
            amount: amount.trim(),
        });

        setName('');
        setAmount('');
    };

    return (
        <div className="glass-panel p-10 flex flex-col gap-6">
            <div className="flex flex-row items-center gap-3 mb-2">
                <Refrigerator className="text-[var(--color-primary)]" size={24} />
                <h2>{t.pantry}</h2>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
                <input
                    type="text"
                    placeholder={t.placeholders.ingredient}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field flex-1"
                />
                <input
                    type="text"
                    placeholder={t.placeholders.amount}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field w-full md:w-32"
                />
                <button type="submit" className="btn btn-primary whitespace-nowrap">
                    <Plus size={18} /> {t.add}
                </button>
            </form>

            <div className="grid grid-cols-1 gap-2 mt-2">
                {pantryItems.length === 0 && (
                    <div className="text-[var(--color-text-muted)] text-center py-4 italic">
                        {t.noVeg}
                    </div>
                )}

                {pantryItems.map((item) => (
                    <div key={item.id} className="glass-card flex flex-row items-center justify-between" style={{ padding: '0.75rem' }}>
                        <div className="flex flex-row items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></div>
                            <span className="font-semibold">{item.name}</span>
                            <span className="text-[var(--color-text-muted)] text-sm bg-white/50 dark:bg-white/10 rounded-md shadow-sm" style={{ padding: '0.25rem 0.75rem' }}>
                                {item.amount}
                            </span>
                        </div>
                        <button
                            onClick={() => onRemovePantryItem(item.id)}
                            className="btn-icon text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-full p-2"
                            title={t.remove}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
