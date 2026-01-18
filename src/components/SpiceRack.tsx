import React, { useState } from 'react';
import { Plus, Trash2, Leaf, Info, ChevronUp, ChevronDown } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface SpiceRackProps {
    spices: string[];
    onAddSpice: (spice: string) => void;
    onRemoveSpice: (spice: string) => void;
    isMinimized: boolean;
    onToggleMinimize: () => void;
}

export const SpiceRack: React.FC<SpiceRackProps> = ({
    spices,
    onAddSpice,
    onRemoveSpice,
    isMinimized,
    onToggleMinimize
}) => {
    const { t } = useSettings();
    const [newSpice, setNewSpice] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSpice.trim()) return;

        // Check for duplicate spice
        if (spices.includes(newSpice.trim())) return;

        onAddSpice(newSpice.trim());
        setNewSpice('');
    };

    return (
        <div className="glass-panel p-10 flex flex-col gap-6">
            <div className="flex flex-row items-center justify-between mb-2">
                <div className="flex flex-row items-center gap-3">
                    <Leaf className="text-primary" size={24} />
                    <h2>{t.spiceRack}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <div className="tooltip-container">
                        <button
                            type="button"
                            className="text-text-muted hover:text-primary transition-colors p-1.5 rounded-full outline-none focus:text-primary"
                            aria-label="Spice Rack Info"
                        >
                            <Info size={18} />
                        </button>
                        <div className="tooltip-text">
                            {t.spiceRackInfo}
                        </div>
                    </div>
                    <div className="tooltip-container">
                        <button
                            onClick={onToggleMinimize}
                            className="p-1.5 rounded-lg bg-white/50 dark:bg-black/20 border border-[var(--glass-border)] hover:bg-white/70 dark:hover:bg-black/30 transition-all text-text-muted hover:text-primary"
                            aria-label={isMinimized ? t.spiceRackExpand : t.spiceRackMinimize}
                        >
                            {isMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                        <div className="tooltip-text">
                            {isMinimized ? t.spiceRackExpand : t.spiceRackMinimize}
                        </div>
                    </div>
                </div>
            </div>

            {!isMinimized && (
                <>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                        <input
                            type="text"
                            placeholder={t.spicesPlaceholder}
                            value={newSpice}
                            onChange={(e) => setNewSpice(e.target.value)}
                            className="input-field w-full flex-1"
                        />
                        <button type="submit" className="btn btn-primary whitespace-nowrap">
                            <Plus size={18} /> {t.add}
                        </button>
                    </form>

                    <div className="flex flex-wrap gap-2 mt-2">
                        {spices.length === 0 && (
                            <div className="text-text-muted text-center py-4 italic w-full">
                                {t.noSpices}
                            </div>
                        )}

                        {spices.map((spice) => (
                            <div key={spice} className="flex flex-row items-center gap-1 px-2 py-0.5 rounded-full border border-border-base bg-bg-surface shadow-sm hover:border-border-hover transition-colors">
                                <span className="font-medium text-xs text-text-main">{spice}</span>
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
                </>
            )}
        </div>
    );
};
