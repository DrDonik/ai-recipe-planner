import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Info, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Kitchen } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { TooltipButton } from './ui';
import { VALIDATION } from '../constants';

interface KitchenSwitcherProps {
    kitchens: Kitchen[];
    activeKitchen: Kitchen | null;
    onSwitch: (id: string) => void;
    onCreate: (name: string, copyCurrent: boolean) => void;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string) => void;
}

type EditMode = { type: 'create' } | { type: 'rename'; id: string } | null;

/**
 * Group header row for the Spice Rack + Kitchen Appliances panels: shows
 * which kitchen profile is active and opens a popover to switch, create,
 * rename, or delete kitchens.
 */
export const KitchenSwitcher: React.FC<KitchenSwitcherProps> = ({
    kitchens,
    activeKitchen,
    onSwitch,
    onCreate,
    onRename,
    onDelete,
}) => {
    const { t } = useSettings();
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState<EditMode>(null);
    const [nameInput, setNameInput] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    const closePopover = useCallback(() => {
        setOpen(false);
        setEditMode(null);
        setNameInput('');
        setConfirmDeleteId(null);
    }, []);

    // Close on outside click / Escape (standard popover behaviour).
    useEffect(() => {
        if (!open) return;
        const handlePointerDown = (e: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                closePopover();
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closePopover();
        };
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, closePopover]);

    const startCreate = () => {
        setEditMode({ type: 'create' });
        setNameInput('');
        setConfirmDeleteId(null);
    };

    const startRename = (kitchen: Kitchen) => {
        setEditMode({ type: 'rename', id: kitchen.id });
        setNameInput(kitchen.name);
        setConfirmDeleteId(null);
    };

    const submitName = (copyCurrent: boolean) => {
        const name = nameInput.trim();
        if (!name || !editMode) return;
        if (editMode.type === 'create') {
            onCreate(name, copyCurrent);
            closePopover();
        } else {
            onRename(editMode.id, name);
            setEditMode(null);
            setNameInput('');
        }
    };

    const nameForm = (kitchen?: Kitchen) => (
        <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
                e.preventDefault();
                submitName(false);
            }}
        >
            <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={t.kitchen.namePlaceholder}
                aria-label={t.kitchen.namePlaceholder}
                maxLength={VALIDATION.MAX_INPUT_LENGTH}
                className="input-field-sm w-full min-w-0 flex-1"
                autoFocus
            />
            {kitchen ? (
                <button
                    type="submit"
                    disabled={!nameInput.trim()}
                    className="btn-icon text-primary disabled:opacity-40"
                    aria-label={t.kitchen.saveAria}
                >
                    <Check size={16} />
                </button>
            ) : (
                <>
                    <button
                        type="submit"
                        disabled={!nameInput.trim()}
                        className="px-2 py-1 text-xs font-semibold rounded-md border border-border-base hover:border-border-hover text-text-main disabled:opacity-40 whitespace-nowrap"
                    >
                        {t.kitchen.createEmpty}
                    </button>
                    <button
                        type="button"
                        disabled={!nameInput.trim()}
                        onClick={() => submitName(true)}
                        className="px-2 py-1 text-xs font-semibold rounded-md border border-border-base hover:border-border-hover text-text-main disabled:opacity-40 whitespace-nowrap"
                    >
                        {t.kitchen.createCopy}
                    </button>
                </>
            )}
        </form>
    );

    return (
        <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    {t.kitchen.caption}
                </span>
                <TooltipButton
                    icon={<Info size={14} />}
                    tooltip={t.kitchen.info}
                    ariaLabel={t.kitchen.info}
                />
            </div>

            <div className="relative" ref={rootRef}>
                <button
                    type="button"
                    onClick={() => (open ? closePopover() : setOpen(true))}
                    aria-haspopup="true"
                    aria-expanded={open}
                    aria-label={`${t.kitchen.switchAria}: ${activeKitchen?.name ?? t.kitchen.defaultName}`}
                    className="flex items-center gap-1 max-w-48 px-3 py-1 rounded-full border border-border-base bg-bg-surface shadow-sm hover:border-border-hover transition-colors text-sm font-medium text-text-main"
                >
                    <span className="truncate">{activeKitchen?.name ?? t.kitchen.defaultName}</span>
                    <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                    <div className="absolute right-0 top-full mt-2 z-50 w-64 glass-card p-3 flex flex-col gap-1">
                        {kitchens.map((kitchen) => (
                            <div key={kitchen.id} className="flex items-center gap-1">
                                {editMode?.type === 'rename' && editMode.id === kitchen.id ? (
                                    <div className="flex-1 min-w-0">{nameForm(kitchen)}</div>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onSwitch(kitchen.id);
                                                closePopover();
                                            }}
                                            className="flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm hover:bg-bg-surface-hover text-text-main"
                                            aria-current={kitchen.id === activeKitchen?.id}
                                        >
                                            <Check
                                                size={14}
                                                className={`shrink-0 text-primary ${kitchen.id === activeKitchen?.id ? '' : 'invisible'}`}
                                            />
                                            <span className="truncate">{kitchen.name}</span>
                                        </button>
                                        {confirmDeleteId === kitchen.id ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onDelete(kitchen.id);
                                                    closePopover();
                                                }}
                                                className="px-2 py-1 text-xs font-semibold rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 whitespace-nowrap"
                                            >
                                                {t.kitchen.confirmDelete}
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => startRename(kitchen)}
                                                    className="btn-icon p-1.5"
                                                    aria-label={`${t.kitchen.renameAria}: ${kitchen.name}`}
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                {kitchens.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDeleteId(kitchen.id)}
                                                        className="btn-icon p-1.5 hover:text-red-500"
                                                        aria-label={`${t.kitchen.deleteAria}: ${kitchen.name}`}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}

                        <hr className="my-1 border-border-base" />

                        {editMode?.type === 'create' ? (
                            nameForm()
                        ) : (
                            <button
                                type="button"
                                onClick={startCreate}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm hover:bg-bg-surface-hover text-text-main"
                            >
                                <Plus size={14} className="shrink-0 text-primary" />
                                {t.kitchen.newKitchen}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

KitchenSwitcher.displayName = 'KitchenSwitcher';
