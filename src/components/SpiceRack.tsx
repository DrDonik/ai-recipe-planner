import React, { useState } from 'react';
import { Plus, Trash2, Leaf } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { PanelHeader } from './ui';

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
        <div className="glass-panel p-6 flex flex-col gap-6">
            <PanelHeader
                icon={<Leaf className="text-primary" size={24} />}
                title={t.spiceRack}
                isMinimized={isMinimized}
                onToggleMinimize={onToggleMinimize}
                minimizeLabel={t.spiceRackMinimize}
                expandLabel={t.spiceRackExpand}
                infoTooltip={t.spiceRackInfo}
                infoAriaLabel={t.spiceRackInfo}
            />

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
                                    type="button"
                                    onClick={() => onRemoveSpice(spice)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-full p-0.5 transition-colors"
                                    aria-label={t.remove}
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
