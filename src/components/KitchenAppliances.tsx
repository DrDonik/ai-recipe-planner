import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Plus, Trash2, ChefHat } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { PanelHeader } from './ui';
import { VALIDATION } from '../constants';

export interface KitchenAppliancesRef {
    flushPendingInput: () => string | null;
}

interface KitchenAppliancesProps {
    appliances: string[];
    onAddAppliance: (appliance: string) => void;
    onRemoveAppliance: (appliance: string) => void;
    isMinimized: boolean;
    onToggleMinimize: () => void;
}

export const KitchenAppliances = forwardRef<KitchenAppliancesRef, KitchenAppliancesProps>(({
    appliances,
    onAddAppliance,
    onRemoveAppliance,
    isMinimized,
    onToggleMinimize
}, ref) => {
    const { t } = useSettings();
    const [newAppliance, setNewAppliance] = useState('');

    const flushPendingInput = (): string | null => {
        const trimmed = newAppliance.trim();
        if (!trimmed) return null;

        setNewAppliance('');

        if (appliances.some(a => a.toLowerCase() === trimmed.toLowerCase())) return null;

        onAddAppliance(trimmed);
        return trimmed;
    };

    useImperativeHandle(ref, () => ({
        flushPendingInput,
    }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        flushPendingInput();
    };

    return (
        <div className="glass-panel p-6 flex flex-col gap-6">
            <PanelHeader
                icon={<ChefHat className="text-primary" size={24} />}
                title={t.kitchenAppliances}
                isMinimized={isMinimized}
                onToggleMinimize={onToggleMinimize}
                infoTooltip={t.kitchenAppliancesInfo}
                infoAriaLabel={t.kitchenAppliancesInfo}
            />

            {!isMinimized && (
                <>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                        <input
                            type="text"
                            placeholder={t.appliancesPlaceholder}
                            value={newAppliance}
                            onChange={(e) => setNewAppliance(e.target.value)}
                            maxLength={VALIDATION.MAX_INPUT_LENGTH}
                            className="input-field w-full flex-1"
                            aria-label={t.appliancesPlaceholder}
                        />
                        <button type="submit" className="btn btn-primary whitespace-nowrap">
                            <Plus size={18} /> {t.add}
                        </button>
                    </form>

                    <div className="flex flex-wrap gap-2 mt-2">
                        {appliances.length === 0 && (
                            <div className="text-text-muted text-center py-4 italic w-full">
                                {t.noAppliances}
                            </div>
                        )}

                        {appliances.map((appliance) => (
                            <div key={appliance} className="flex flex-row items-center gap-1 px-2 py-0.5 rounded-full border border-border-base bg-bg-surface shadow-sm hover:border-border-hover transition-colors">
                                <span className="font-medium text-xs text-text-main">{appliance}</span>
                                <button
                                    type="button"
                                    onClick={() => onRemoveAppliance(appliance)}
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
});

KitchenAppliances.displayName = 'KitchenAppliances';
