import React, { useState, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { Plus, Trash2, Refrigerator } from 'lucide-react';
import type { PantryItem } from '../types';
import { generateId } from '../utils/idGenerator';
import { useSettings } from '../contexts/SettingsContext';
import { PanelHeader } from './ui';

interface PantryInputProps {
    pantryItems: PantryItem[];
    onAddPantryItem: (item: PantryItem) => void;
    onRemovePantryItem: (id: string) => void;
    onEmptyPantry: () => void;
    isMinimized: boolean;
    onToggleMinimize: () => void;
}

export interface PantryInputRef {
    flushPendingInput: () => PantryItem | null;
}

export const PantryInput = forwardRef<PantryInputRef, PantryInputProps>(({
    pantryItems,
    onAddPantryItem,
    onRemovePantryItem,
    onEmptyPantry,
    isMinimized,
    onToggleMinimize
}, ref) => {
    const { t } = useSettings();
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);
    const amountInputRef = useRef<HTMLInputElement>(null);

    // Focus ingredient field on mount
    useEffect(() => {
        nameInputRef.current?.focus();
    }, []);

    const flushPendingInput = (): PantryItem | null => {
        if (name.trim()) {
            const newItem: PantryItem = {
                id: generateId(),
                name: name.trim(),
                amount: amount.trim() || 'some'
            };
            onAddPantryItem(newItem);
            setName('');
            setAmount('');
            // Return focus to ingredient field after adding
            nameInputRef.current?.focus();
            return newItem;
        }
        return null;
    };

    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            amountInputRef.current?.focus();
        }
    };

    useImperativeHandle(ref, () => ({
        flushPendingInput
    }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        flushPendingInput();
    };

    return (
        <div className="glass-panel p-6 flex flex-col gap-6">
            <PanelHeader
                icon={<Refrigerator className="text-primary" size={24} />}
                title={t.pantry}
                isMinimized={isMinimized}
                onToggleMinimize={onToggleMinimize}
                infoTooltip={t.pantryInfo}
                infoAriaLabel={t.pantryInfo}
            />

            {!isMinimized && (
                <>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3">
                            <input
                                ref={nameInputRef}
                                type="text"
                                placeholder={t.placeholders.ingredient}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={handleNameKeyDown}
                                className="input-field w-full"
                            />
                        </div>
                        <div className="flex gap-2">
                            <input
                                ref={amountInputRef}
                                type="text"
                                placeholder={t.placeholders.amount}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="input-field flex-1"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="btn btn-primary whitespace-nowrap flex-1">
                                <Plus size={18} /> {t.add}
                            </button>
                        </div>
                    </form>

                    <div className="grid grid-cols-1 gap-2 mt-2">
                        {pantryItems.length === 0 && (
                            <div className="text-text-muted text-center py-8 italic border border-dashed border-[var(--glass-border)] rounded-xl bg-white/10">
                                {t.noVeg}
                            </div>
                        )}
                        {pantryItems.map((item) => (
                            <div key={item.id} className="glass-card flex flex-row items-center justify-between p-3 animate-in fade-in slide-in-from-left-2 hover:border-border-hover transition-colors">
                                <div className="flex flex-row items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/20"></div>
                                    <span className="font-semibold text-text-main">{item.name}</span>
                                    <span className="text-text-muted text-xs bg-white/50 dark:bg-white/10 px-2 py-0.5 rounded-md shadow-sm border border-[var(--glass-border)]">
                                        {item.amount}
                                    </span>
                                </div>
                                <div className="tooltip-container">
                                    <button
                                        type="button"
                                        onClick={() => onRemovePantryItem(item.id)}
                                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-full p-1.5 transition-colors"
                                        aria-label={t.remove}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="tooltip-text">
                                        {t.remove}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {pantryItems.length > 0 && (
                            <div className="flex justify-end mt-2">
                                <button
                                    type="button"
                                    onClick={onEmptyPantry}
                                    className="text-sm text-text-muted hover:text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Trash2 size={14} />
                                    {t.emptyPantry}
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
});

PantryInput.displayName = 'PantryInput';
