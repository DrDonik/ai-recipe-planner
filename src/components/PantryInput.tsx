import React, { useState, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { Plus, Trash2, Refrigerator, Info, Loader2, X, Camera } from 'lucide-react';
import type { PantryItem, Notification } from '../types';
import { generateId } from '../utils/idGenerator';
import { useSettings } from '../contexts/SettingsContext';
import { useStorageTips } from '../hooks/useStorageTips';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { PanelHeader, UndoToast } from './ui';
import { PhotoPrivacyDialog } from './PhotoPrivacyDialog';
import { STORAGE_KEYS, VALIDATION } from '../constants';
import { downscaleImage } from '../utils/imageDownscale';
import { identifyIngredientFromImage, IdentifyIngredientError } from '../services/llm';

interface PantryInputProps {
    pantryItems: PantryItem[];
    onAddPantryItem: (item: PantryItem) => void;
    onRemovePantryItem: (id: string) => void;
    onUpdatePantryItem: (id: string, newAmount: string) => void;
    onEmptyPantry: () => void;
    isMinimized: boolean;
    onToggleMinimize: () => void;
    notification?: Notification | null;
    autoFocus?: boolean;
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
    onToggleMinimize,
    notification,
    autoFocus = true
}, ref) => {
    const { t, useCopyPaste, apiKey, language } = useSettings();
    const tipsActive = !useCopyPaste && !!apiKey;
    const cameraEnabled = !useCopyPaste && !!apiKey;
    const { getTip, fetchTip, isLoading: isTipLoading, getError: getTipError } = useStorageTips();
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingAmount, setEditingAmount] = useState('');
    const [openTipForId, setOpenTipForId] = useState<string | null>(null);
    const [identifying, setIdentifying] = useState(false);
    const [identifyError, setIdentifyError] = useState<string | null>(null);
    const [showPhotoPrivacy, setShowPhotoPrivacy] = useState(false);
    const [photoPrivacyAck, setPhotoPrivacyAck] = useLocalStorage<boolean>(STORAGE_KEYS.PHOTO_PRIVACY_ACK, false);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const amountInputRef = useRef<HTMLInputElement>(null);
    const editAmountInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const isCancellingRef = useRef(false);
    const identifyAbortRef = useRef<AbortController | null>(null);

    const handleTipClick = (item: PantryItem) => {
        if (openTipForId === item.id) {
            setOpenTipForId(null);
            return;
        }
        setOpenTipForId(item.id);
        if (!getTip(item.name)) {
            void fetchTip(item.name);
        }
    };

    useEffect(() => {
        if (!openTipForId) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Element | null;
            if (!target) return;
            if (popoverRef.current?.contains(target)) return;
            if (target.closest('[data-storage-tip-trigger="true"]')) return;
            setOpenTipForId(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [openTipForId]);

    useEffect(() => {
        if (!tipsActive && openTipForId) {
            setOpenTipForId(null);
        }
    }, [tipsActive, openTipForId]);

    // Focus ingredient field on mount, unless suppressed (e.g. when a meal
    // plan is already shown above the inputs and focusing would scroll past it).
    useEffect(() => {
        if (autoFocus) {
            nameInputRef.current?.focus({ preventScroll: true });
        }
    }, [autoFocus]);

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

    const openFilePicker = () => {
        setIdentifyError(null);
        fileInputRef.current?.click();
    };

    const handleCameraClick = () => {
        if (identifying) {
            identifyAbortRef.current?.abort();
            return;
        }
        if (!photoPrivacyAck) {
            setShowPhotoPrivacy(true);
            return;
        }
        openFilePicker();
    };

    const handlePhotoPrivacyAccept = () => {
        setPhotoPrivacyAck(true);
        setShowPhotoPrivacy(false);
        // Wait a tick so the dialog unmounts and focus restoration doesn't fight the file picker.
        setTimeout(() => openFilePicker(), 0);
    };

    const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Reset the input so picking the same file twice in a row still triggers change.
        e.target.value = '';
        if (!file || !apiKey) return;

        setIdentifyError(null);
        setIdentifying(true);
        const controller = new AbortController();
        identifyAbortRef.current = controller;

        try {
            let base64: string;
            let mimeType: string;
            try {
                ({ base64, mimeType } = await downscaleImage(file));
            } catch (decodeErr) {
                const detail = decodeErr instanceof Error ? decodeErr.message : String(decodeErr);
                throw new IdentifyIngredientError('decode', detail, { cause: decodeErr });
            }
            const ingredient = await identifyIngredientFromImage(
                apiKey,
                base64,
                mimeType,
                language,
                controller.signal
            );
            setName(ingredient);
            // Defer focus until after the disabled state clears so the input is focusable.
            setTimeout(() => amountInputRef.current?.focus(), 0);
        } catch (err) {
            // Defer focus until after `identifying` flips false in `finally` and the
            // input's `disabled` attribute clears — `.focus()` on a disabled input is a no-op.
            if (err instanceof Error && err.name === 'AbortError') {
                // User cancelled — no error message, return focus to the name field.
                setTimeout(() => nameInputRef.current?.focus(), 0);
                return;
            }
            const kind = err instanceof IdentifyIngredientError ? err.kind : 'error';
            const detail = err instanceof Error ? err.message : '';
            const base =
                kind === 'unknown' ? t.identifyIngredient.unknown
                : kind === 'multiple' ? t.identifyIngredient.multiple
                : kind === 'quota' ? t.identifyIngredient.quotaExceeded
                : kind === 'decode' ? t.identifyIngredient.decodeFailed
                : t.identifyIngredient.error;
            // Append the underlying detail for decode/error so we can diagnose
            // why iOS standalone (home-screen) webapp mode fails where Safari works.
            const message =
                (kind === 'decode' || kind === 'error') && detail
                    ? `${base} (${detail})`
                    : base;
            setIdentifyError(message);
            setTimeout(() => nameInputRef.current?.focus(), 0);
        } finally {
            setIdentifying(false);
            identifyAbortRef.current = null;
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
        <div className="glass-panel p-6 flex flex-col gap-6 relative z-20">
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
                            <div className="relative">
                                <input
                                    ref={nameInputRef}
                                    type="text"
                                    placeholder={identifying ? t.identifyIngredient.identifying : t.placeholders.ingredient}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onKeyDown={handleNameKeyDown}
                                    maxLength={VALIDATION.MAX_INPUT_LENGTH}
                                    disabled={identifying}
                                    aria-busy={identifying}
                                    className={`input-field w-full ${cameraEnabled ? 'pr-12' : ''}`}
                                    aria-label={t.placeholders.ingredient}
                                />
                                {cameraEnabled && (
                                    <button
                                        type="button"
                                        onClick={handleCameraClick}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-primary hover:bg-primary/10 transition-colors"
                                        aria-label={identifying ? t.identifyIngredient.cancelAriaLabel : t.identifyIngredient.buttonAriaLabel}
                                    >
                                        {identifying ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Camera size={18} />
                                        )}
                                    </button>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handlePhotoSelected}
                                    className="hidden"
                                    aria-hidden="true"
                                    tabIndex={-1}
                                />
                            </div>
                            {identifyError && (
                                <p role="alert" className="text-sm text-red-500">
                                    {identifyError}
                                </p>
                            )}
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
                            notification?.anchor === 'pantry' ? (
                                <UndoToast notification={notification} />
                            ) : (
                                <div className="text-text-muted text-center py-8 italic border border-dashed border-[var(--glass-border)] rounded-xl bg-white/10">
                                    {t.noVeg}
                                </div>
                            )
                        )}
                        {pantryItems.map((item) => {
                            const cachedTip = tipsActive ? getTip(item.name) : undefined;
                            const tipLoading = tipsActive && isTipLoading(item.name);
                            const tipError = tipsActive ? getTipError(item.name) : undefined;
                            const tipOpen = openTipForId === item.id && tipsActive;
                            return (
                            <div key={item.id} className="glass-card flex flex-row items-center justify-between p-3 animate-in fade-in slide-in-from-left-2 hover:border-border-hover transition-colors">
                                <div className="flex flex-row items-center gap-3">
                                    {tipsActive ? (
                                        <div className="relative">
                                            <button
                                                type="button"
                                                data-storage-tip-trigger="true"
                                                onClick={() => handleTipClick(item)}
                                                className={`w-6 h-6 flex items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 ${cachedTip ? 'ring-2 ring-primary/40' : ''}`}
                                                aria-label={`${t.storageTips.iconAriaLabel}: ${item.name}`}
                                                aria-expanded={tipOpen}
                                            >
                                                {tipLoading ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Info size={14} className={cachedTip ? 'fill-primary/15' : ''} />
                                                )}
                                            </button>
                                            {tipOpen && (
                                                <div
                                                    ref={popoverRef}
                                                    role="dialog"
                                                    aria-label={`${t.storageTips.popoverTitle}: ${item.name}`}
                                                    className="absolute z-40 top-full left-0 mt-2 w-64 max-w-[80vw] bg-bg-surface border border-border-base rounded-xl p-3 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150"
                                                >
                                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                                                            {t.storageTips.popoverTitle}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setOpenTipForId(null)}
                                                            className="text-text-muted hover:text-primary transition-colors p-0.5 rounded-full"
                                                            aria-label={t.storageTips.close}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    {cachedTip ? (
                                                        <p className="text-sm text-text-main leading-relaxed">{cachedTip}</p>
                                                    ) : tipLoading ? (
                                                        <p className="text-sm text-text-muted italic flex items-center gap-2">
                                                            <Loader2 size={14} className="animate-spin" />
                                                            {t.storageTips.loading}
                                                        </p>
                                                    ) : tipError ? (
                                                        <p className="text-sm text-red-500">{tipError}</p>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/20"></div>
                                    )}
                                    <span className="font-semibold text-text-main">{item.name}</span>
                                    {editingItemId === item.id ? (
                                        <input
                                            ref={editAmountInputRef}
                                            type="text"
                                            value={editingAmount}
                                            onChange={(e) => setEditingAmount(e.target.value)}
                                            onKeyDown={handleEditAmountKeyDown}
                                            onBlur={saveEditingAmount}
                                            maxLength={VALIDATION.MAX_INPUT_LENGTH}
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
                            );
                        })}
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
            {showPhotoPrivacy && (
                <PhotoPrivacyDialog
                    onAccept={handlePhotoPrivacyAccept}
                    onCancel={() => setShowPhotoPrivacy(false)}
                />
            )}
        </div>
    );
});

PantryInput.displayName = 'PantryInput';
