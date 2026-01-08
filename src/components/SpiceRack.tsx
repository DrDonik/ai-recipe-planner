import React, { useState } from 'react';
import { Plus, Trash2, Leaf, Info } from 'lucide-react';
import { translations } from '../constants/translations';

interface SpiceRackProps {
    spices: string[];
    onAddSpice: (spice: string) => void;
    onRemoveSpice: (spice: string) => void;
    language: string;
}

export const SpiceRack: React.FC<SpiceRackProps> = ({
    spices,
    onAddSpice,
    onRemoveSpice,
    language
}) => {
    const t = translations[language as keyof typeof translations];
    const [newSpice, setNewSpice] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSpice.trim()) return;

        onAddSpice(newSpice.trim());
        setNewSpice('');
    };

    return (
        <div className="glass-panel p-10 flex flex-col gap-6">
            <div className="flex flex-row items-center justify-between mb-2">
                <div className="flex flex-row items-center gap-3">
                    <Leaf className="text-[var(--color-primary)]" size={24} />
                    <h2>{t.spiceRack}</h2>
                </div>
                <div className="tooltip-container">
                    <button
                        type="button"
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors p-1.5 rounded-full outline-none focus:text-[var(--color-primary)]"
                        aria-label="Spice Rack Info"
                    >
                        <Info size={18} />
                    </button>
                    <div className="tooltip-text">
                        {t.spiceRackInfo}
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-row gap-3">
                <input
                    type="text"
                    placeholder={t.spicesPlaceholder}
                    value={newSpice}
                    onChange={(e) => setNewSpice(e.target.value)}
                    className="input-field flex-1"
                />
                <button type="submit" className="btn btn-primary whitespace-nowrap">
                    <Plus size={18} /> {t.add}
                </button>
            </form>

            <div className="flex flex-wrap gap-2 mt-2">
                {spices.length === 0 && (
                    <div className="text-[var(--color-text-muted)] text-center py-4 italic w-full">
                        {t.noVeg.replace('Zutaten', 'Gewürze').replace('ingredients', 'spices')}
                    </div>
                )}

                {spices.map((spice) => (
                    <div key={spice} className="flex flex-row items-center gap-1 px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-sm">
                        <span className="font-medium text-xs text-[var(--color-text-main)]">{spice}</span>
                        <button
                            onClick={() => onRemoveSpice(spice)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-full p-0.5 transition-colors"
                            title={t.remove}
                        >
                            <Trash2 size={10} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
