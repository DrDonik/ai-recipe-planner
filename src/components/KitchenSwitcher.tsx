import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Info, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Kitchen, KitchenLocation } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { TooltipButton } from './ui';
import { OPEN_METEO, VALIDATION } from '../constants';
import { searchLocations, type Forecast, type LocationSuggestion } from '../services/weather';

interface KitchenSwitcherProps {
    kitchens: Kitchen[];
    activeKitchen: Kitchen | null;
    /** Forecast for the active kitchen's location, if any could be fetched. */
    forecast?: Forecast;
    onSwitch: (id: string) => void;
    onCreate: (name: string, copyCurrent: boolean) => void;
    onRename: (id: string, name: string) => void;
    onSetLocation: (id: string, location: KitchenLocation | null) => void;
    onDelete: (id: string) => void;
}

type EditMode = { type: 'create' } | { type: 'edit'; id: string } | null;

/** Debounce before a keystroke turns into a geocoding request. */
const SEARCH_DEBOUNCE_MS = 300;

interface LocationFieldProps {
    kitchen: Kitchen;
    onSelect: (location: KitchenLocation) => void;
    onClear: () => void;
}

/**
 * Town picker for a kitchen: type a name, pick a geocoding hit, and the
 * coordinates are stored on the kitchen. Selecting or clearing applies
 * immediately — there is nothing to confirm, and a half-typed name that
 * matches no place simply does nothing.
 */
const LocationField: React.FC<LocationFieldProps> = ({ kitchen, onSelect, onClear }) => {
    const { language, t } = useSettings();
    const inputId = useId();
    const [query, setQuery] = useState(kitchen.location?.name ?? '');
    // Results carry the query they belong to, so a stale list can be ignored
    // during render instead of being cleared from the effect.
    const [search, setSearch] = useState<{
        query: string;
        done: boolean;
        suggestions: LocationSuggestion[];
    } | null>(null);

    // Debounced lookup. Skipped while the field still shows the stored
    // location, so merely opening the editor costs no request.
    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2 || trimmed === kitchen.location?.name) return;

        let cancelled = false;
        const controller = new AbortController();
        const timer = setTimeout(() => {
            setSearch({ query: trimmed, done: false, suggestions: [] });
            searchLocations(trimmed, language, controller.signal)
                .then(results => {
                    if (!cancelled) setSearch({ query: trimmed, done: true, suggestions: results });
                })
                .catch(() => {
                    if (!cancelled) setSearch({ query: trimmed, done: true, suggestions: [] });
                });
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, language, kitchen.location?.name]);

    const current = search && search.query === query.trim() ? search : null;
    const suggestions = current?.done ? current.suggestions : [];

    const handleSelect = (suggestion: LocationSuggestion) => {
        onSelect({
            name: suggestion.name,
            latitude: suggestion.latitude,
            longitude: suggestion.longitude,
        });
        // Dropping the results is not redundant with the query comparison
        // above: picking a hit whose name equals what was typed would otherwise
        // leave the list matching, and open, after the location was applied.
        setQuery(suggestion.name);
        setSearch(null);
    };

    const handleClear = () => {
        onClear();
        setQuery('');
        setSearch(null);
    };

    return (
        <div className="flex flex-col gap-1">
            <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {t.kitchen.locationLabel}
            </label>
            <div className="flex items-center gap-1">
                <input
                    id={inputId}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t.kitchen.locationPlaceholder}
                    maxLength={VALIDATION.MAX_INPUT_LENGTH}
                    autoComplete="off"
                    className="input-field-sm w-full min-w-0 flex-1"
                />
                {kitchen.location && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="btn-icon p-1.5"
                        aria-label={t.kitchen.locationClearAria}
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {current && !current.done && <p className="text-xs text-text-muted">{t.kitchen.locationSearching}</p>}
            {current?.done && suggestions.length === 0 && (
                <p className="text-xs text-text-muted">{t.kitchen.locationNoResults}</p>
            )}
            {suggestions.length > 0 && (
                <ul className="flex flex-col rounded-md border border-border-base overflow-hidden">
                    {suggestions.map((suggestion) => (
                        <li key={`${suggestion.latitude},${suggestion.longitude}`}>
                            {/* Flush against an overflow-hidden list, so the
                                focus ring has to sit inside the button. */}
                            <button
                                type="button"
                                onClick={() => handleSelect(suggestion)}
                                className="w-full px-2 py-1.5 text-left text-sm truncate hover:bg-bg-surface-hover text-text-main focus-visible:outline-offset-[-2px]"
                            >
                                {suggestion.label}
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <a
                href={OPEN_METEO.ATTRIBUTION_URL}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-text-muted hover:underline"
            >
                {t.kitchen.weatherAttribution}
            </a>
        </div>
    );
};

/**
 * Group header row for the Spice Rack + Kitchen Appliances panels: shows
 * which kitchen profile is active and opens a popover to switch, create,
 * rename, or delete kitchens.
 */
export const KitchenSwitcher: React.FC<KitchenSwitcherProps> = ({
    kitchens,
    activeKitchen,
    forecast,
    onSwitch,
    onCreate,
    onRename,
    onSetLocation,
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

    const startEdit = (kitchen: Kitchen) => {
        setEditMode({ type: 'edit', id: kitchen.id });
        setNameInput(kitchen.name);
        setConfirmDeleteId(null);
    };

    // Shortcut from the weather line: straight into the active kitchen's
    // editor, which is where a wrong or outdated location gets corrected.
    const editActiveKitchen = () => {
        if (!activeKitchen) return;
        setOpen(true);
        startEdit(activeKitchen);
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

    // What the model is told, in the user's language. Shown only when there is
    // something to show — no location, offline or a failed fetch leaves the
    // header exactly as it was before this feature existed.
    // A tight en dash turns "-5–-1 °C" into a puzzle, so a range with a
    // negative bound gets spaces around the dash.
    const range = forecast
        ? `${forecast.minHighC}${forecast.minHighC < 0 || forecast.maxHighC < 0 ? ' – ' : '–'}${forecast.maxHighC} °C`
        : '';
    const weatherSummary = forecast && activeKitchen?.location
        ? `${activeKitchen.location.name} · ${forecast.changeable ? `${t.kitchen.weatherChangeable}, ` : ''}${range}, ${t.kitchen.weatherConditions[forecast.condition]}`
        : null;

    return (
        <div className="flex flex-col gap-1">
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
                    <div className="absolute right-0 top-full mt-2 z-50 w-72 glass-card p-3 flex flex-col gap-1">
                        {kitchens.map((kitchen) => (
                            <div key={kitchen.id} className="flex items-center gap-1">
                                {editMode?.type === 'edit' && editMode.id === kitchen.id ? (
                                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                                        {nameForm(kitchen)}
                                        <LocationField
                                            kitchen={kitchen}
                                            onSelect={(location) => onSetLocation(kitchen.id, location)}
                                            onClear={() => onSetLocation(kitchen.id, null)}
                                        />
                                    </div>
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
                                            <span className="min-w-0 flex-1 flex flex-col">
                                                <span className="truncate">{kitchen.name}</span>
                                                {kitchen.location && (
                                                    <span className="flex items-center gap-1 text-xs text-text-muted">
                                                        <MapPin size={11} className="shrink-0" />
                                                        <span className="truncate">{kitchen.location.name}</span>
                                                    </span>
                                                )}
                                            </span>
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
                                                    onClick={() => startEdit(kitchen)}
                                                    className="btn-icon p-1.5"
                                                    aria-label={`${t.kitchen.editAria}: ${kitchen.name}`}
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

        {weatherSummary && (
            <button
                type="button"
                onClick={editActiveKitchen}
                // No aria-label: the summary itself is the accessible name, so
                // screen-reader users get the hint the sighted user sees rather
                // than a duplicate of the pencil's label.
                title={t.kitchen.weatherTooltip}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-text-main transition-colors text-left"
            >
                <MapPin size={12} className="shrink-0" />
                <span className="truncate">{weatherSummary}</span>
            </button>
        )}
        </div>
    );
};

KitchenSwitcher.displayName = 'KitchenSwitcher';
