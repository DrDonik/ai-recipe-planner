import React, { useState, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { Plus, Trash2, Refrigerator } from 'lucide-react';
import type { PantryItem } from '../types';
import { generateId } from '../utils/idGenerator';
import { useSettings } from '../contexts/SettingsContext';
import { PanelHeader } from './ui';
import { VALIDATION } from '../constants';

interface PantryInputProps {
    pantryItems: PantryItem[];
    onAddPantryItem: (item: PantryItem) => void;
    onRemovePantryItem: (id: string) => void;
    onUpdatePantryItem: (id: string, newAmount: string) => void;
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
    onUpdatePantryItem,
    onEmptyPantry,
    isMinimized,
    onToggleMinimize
}, ref) => {
    const { t } = useSettings();
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingAmount, setEditingAmount] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);
    const amountInputRef = useRef<HTMLInputElement>(null);
    const editAmountInputRef = useRef<HTMLInputElement>(null);
    const isCancellingRef = useRef(false);

    // Focus ingredient field on mount
    useEffect(() => {
        nameInputRef.current?.focus({ preventScroll: true });
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

    const startEditingAmount = (item: PantryItem) => {
        setEditingItemId(item.id);
        setEditingAmount(item.amount);
    };

    const cancelEditingAmount = () => {
        isCancellingRef.current = true;
        setEditingItemId(null);
        setEditingAmount('');
        setTimeout(() => { isCancellingRef.current = false; }, 0);
    };

    const saveEditingAmount = () => {
        if (isCancellingRef.current) {
            return; // Don't save if cancelling
        }
        if (editingItemId && editingAmount.trim()) {
            onUpdatePantryItem(editingItemId, editingAmount.trim());
        }
        setEditingItemId(null);
        setEditingAmount('');
    };

    const handleEditAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEditingAmount();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEditingAmount();
        }
    };

    // Auto-focus the edit input when editing starts
    useEffect(() => {
        if (editingItemId && editAmountInputRef.current) {
            editAmountInputRef.current.focus();
            editAmountInputRef.current.select();
        }
    }, [editingItemId]);

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
                                maxLength={VALIDATION.MAX_INPUT_LENGTH}
                                className="input-field w-full"
                                aria-label={t.placeholders.ingredient}
                            />
                        </div>
                        <div className="flex gap-2">
                            <input
                                ref={amountInputRef}
                                type="text"
                                placeholder={t.placeholders.amount}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                maxLength={VALIDATION.MAX_INPUT_LENGTH}
                                className="input-field flex-1"
                                aria-label={t.placeholders.amount}
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
                                    {editingItemId === item.id ? (
                                        <input
                                            ref={editAmountInputRef}
                                            type="text"
                                            value={editingAmount}
                                            onChange={(e) => setEditingAmount(e.target.value)}
                                            onKeyDown={handleEditAmountKeyDown}
                                            onBlur={saveEditingAmount}
                                            className="text-text-muted text-xs bg-white/50 dark:bg-white/10 px-2 py-0.5 rounded-md shadow-sm border border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 w-20"
                                            aria-label={`${t.placeholders.amount} ${item.name}`}
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => startEditingAmount(item)}
                                            className="text-text-muted text-xs bg-white/50 dark:bg-white/10 px-2 py-0.5 rounded-md shadow-sm border border-[var(--glass-border)] hover:border-primary hover:bg-white/70 dark:hover:bg-white/20 transition-colors cursor-pointer"
                                            aria-label={`${t.placeholders.amount}: ${item.amount}. ${t.clickToEdit}`}
                                        >
                                            {item.amount}
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemovePantryItem(item.id)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-full p-1.5 transition-colors"
                                    aria-label={t.remove}
                                >
                                    <Trash2 size={16} />
                                </button>
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
