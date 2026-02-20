import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Utensils, ChefHat, Users, Salad, Sparkles, ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import type { Notification } from '../types';
import { VALIDATION } from '../constants';

export interface SettingsPanelRef {
    flushPendingInput: () => string | null;
}

interface SettingsPanelProps {
    optionsMinimized: boolean;
    setOptionsMinimized: (minimized: boolean) => void;
    loading: boolean;
    handleGenerate: () => void;
    notification: Notification | null;
}

export const SettingsPanel = forwardRef<SettingsPanelRef, SettingsPanelProps>(({
    optionsMinimized,
    setOptionsMinimized,
    loading,
    handleGenerate,
    notification
}, ref) => {
    const { diet, setDiet, styleWishes, setStyleWishes, people, setPeople, meals, setMeals, t } = useSettings();
    const [newStyleWish, setNewStyleWish] = useState('');

    const flushPendingInput = (): string | null => {
        const trimmed = newStyleWish.trim();
        if (!trimmed) return null;

        setNewStyleWish('');

        if (styleWishes.includes(trimmed)) return null;

        setStyleWishes([...styleWishes, trimmed]);
        return trimmed;
    };

    useImperativeHandle(ref, () => ({
        flushPendingInput,
    }));

    const handleAddStyleWish = (e: React.FormEvent) => {
        e.preventDefault();
        flushPendingInput();
    };

    const handleRemoveStyleWish = (wishToRemove: string) => {
        setStyleWishes(styleWishes.filter(wish => wish !== wishToRemove));
    };

    // Helper function to render text with clickable URLs
    const renderTextWithLinks = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const isUrl = (part: string) => /^https?:\/\/[^\s]+$/.test(part);
        const parts = text.split(urlRegex);

        return parts.map((part, index) => {
            if (isUrl(part)) {
                return (
                    <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-red-800 transition-colors"
                    >
                        {part}
                    </a>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <>
            {/* Preferences Panel */}
            <div className="glass-panel p-6 space-y-2">
                {/* Diet Preference */}
                <div className="flex flex-col items-start gap-3">
                    <div className="flex items-center gap-3 justify-between w-full">
                        <div className="flex items-center gap-3">
                            <Utensils className="text-secondary" size={24} />
                            <span>{t.diet}</span>
                        </div>
                        <button
                            onClick={() => setOptionsMinimized(!optionsMinimized)}
                            className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors text-text-muted hover:text-primary"
                            aria-label={optionsMinimized ? 'Expand' : 'Collapse'}
                            aria-expanded={!optionsMinimized}
                        >
                            {optionsMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </button>
                    </div>
                    {!optionsMinimized && (
                        <>
                            <label htmlFor="diet-select" className="sr-only">{t.diet}</label>
                            <select
                                id="diet-select"
                                value={diet}
                                onChange={(e) => setDiet(e.target.value)}
                                className="select-field bg-white/50 dark:bg-black/20 border-[var(--glass-border)]"
                            >
                                <option value="Vegan">{t.dietOptions.vegan}</option>
                                <option value="Vegetarian">{t.dietOptions.vegetarian}</option>
                                <option value="Mostly Vegetarian">{t.dietOptions.mostlyVegetarian}</option>
                                <option value="Pescatarian">{t.dietOptions.pescatarian}</option>
                                <option value="Flexitarian">{t.dietOptions.flexitarian}</option>
                                <option value="Omnivore">{t.dietOptions.omnivore}</option>
                                <option value="Carnivore">{t.dietOptions.carnivore}</option>
                            </select>
                        </>
                    )}
                </div>

                {!optionsMinimized && (
                    <>
                        {/* Separator */}
                        <div className="h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />

                        {/* Style, Wishes, etc. */}
                        <div className="flex flex-col items-start gap-3">
                            <div className="flex items-center gap-3">
                                <ChefHat className="text-secondary" size={24} />
                                <span>{t.styleWishes}</span>
                            </div>
                            <form onSubmit={handleAddStyleWish} className="flex items-center gap-2 w-full">
                                <input
                                    id="style-wishes-input"
                                    type="text"
                                    value={newStyleWish}
                                    onChange={(e) => setNewStyleWish(e.target.value)}
                                    placeholder={t.styleWishesPlaceholder}
                                    maxLength={VALIDATION.MAX_INPUT_LENGTH}
                                    className="input-field-sm bg-white/50 dark:bg-black/20 border-[var(--glass-border)] flex-1"
                                    aria-label={t.styleWishesPlaceholder}
                                />
                                <button
                                    type="submit"
                                    className="w-8 h-8 flex items-center justify-center rounded bg-primary hover:bg-primary-dark text-white shadow-sm transition-colors shrink-0"
                                    aria-label={t.add}
                                >
                                    <Plus size={18} />
                                </button>
                            </form>
                            <div className="flex flex-wrap gap-2 w-full">
                                {styleWishes.length === 0 && (
                                    <div className="text-text-muted text-center py-2 italic w-full text-sm">
                                        {t.noStyleWishes}
                                    </div>
                                )}
                                {styleWishes.map((wish) => (
                                    <div key={wish} className="flex flex-row items-center gap-1 px-2 py-0.5 rounded-full border border-border-base bg-bg-surface shadow-sm hover:border-border-hover transition-colors">
                                        <span className="font-medium text-xs text-text-main">{wish}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveStyleWish(wish)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-full p-0.5 transition-colors"
                                            aria-label={t.remove}
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />

                        {/* People Count */}
                        <div className="flex flex-col items-start gap-3">
                            <div className="flex items-center gap-3" id="people-count-label">
                                <Users className="text-secondary" size={24} />
                                <span>{t.people}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 rounded-lg p-1 w-max" role="group" aria-labelledby="people-count-label">
                                <button
                                    type="button"
                                    onClick={() => setPeople(Math.max(1, people - 1))}
                                    className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-gray-50 shadow-sm text-lg font-bold transition-colors text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100"
                                    aria-label={t.decreasePeople}
                                >-</button>
                                <span className="w-8 text-center font-mono font-semibold text-sm" aria-live="polite">{people}</span>
                                <button
                                    type="button"
                                    onClick={() => setPeople(Math.min(20, people + 1))}
                                    className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-gray-50 shadow-sm text-lg font-bold transition-colors text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100"
                                    aria-label={t.increasePeople}
                                >+</button>
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />

                        {/* Meals Count */}
                        <div className="flex flex-col items-start gap-3">
                            <div className="flex items-center gap-3" id="meals-count-label">
                                <Salad className="text-secondary" size={24} />
                                <span>{t.meals}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 rounded-lg p-1 w-max" role="group" aria-labelledby="meals-count-label">
                                <button
                                    type="button"
                                    onClick={() => setMeals(Math.max(1, meals - 1))}
                                    className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-gray-50 shadow-sm text-lg font-bold transition-colors text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100"
                                    aria-label={t.decreaseMeals}
                                >-</button>
                                <span className="w-8 text-center font-mono font-semibold text-sm" aria-live="polite">{meals}</span>
                                <button
                                    type="button"
                                    onClick={() => setMeals(Math.min(10, meals + 1))}
                                    className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-gray-50 shadow-sm text-lg font-bold transition-colors text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100"
                                    aria-label={t.increaseMeals}
                                >+</button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <button
                onClick={handleGenerate}
                disabled={loading}
                aria-busy={loading}
                className={`btn btn-primary w-full py-4 text-lg rounded-xl shadow-lg shadow-primary/20 ${loading ? 'opacity-80 cursor-wait' : ''}`}
            >
                {loading ? (
                    <>
                        <span
                            className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"
                            role="status"
                            aria-label={t.planning}
                        ></span>
                        <span aria-live="polite">{t.planning}</span>
                    </>
                ) : (
                    <>
                        <Sparkles size={20} /> {t.generate}
                    </>
                )}
            </button>

            {notification && (
                <div
                    role="alert"
                    aria-live="assertive"
                    aria-atomic="true"
                    className={`p-4 rounded-xl border text-sm animate-in fade-in slide-in-from-top-2 flex items-center justify-between gap-3 ${
                        notification.type === 'error'
                            ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900'
                            : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                    }`}
                >
                    <span className="flex-1">{renderTextWithLinks(notification.message)}</span>
                    {notification.action && (
                        <button
                            onClick={notification.action.onClick}
                            aria-label={notification.action.ariaLabel || notification.action.label}
                            className={`px-3 py-1 rounded-lg font-medium text-sm transition-colors shrink-0 ${
                                notification.type === 'error'
                                    ? 'bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800'
                                    : 'bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700'
                            }`}
                        >
                            {notification.action.label}
                        </button>
                    )}
                </div>
            )}
        </>
    );
});

SettingsPanel.displayName = 'SettingsPanel';
