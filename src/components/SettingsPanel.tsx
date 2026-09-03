import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Utensils, ChefHat, NotepadText, Users, Salad, Sparkles, ChevronUp, ChevronDown, Plus, Trash2, X, Camera, PencilLine, ScrollText } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import type { Notification } from '../types';
import { STORAGE_KEYS, VALIDATION } from '../constants';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { UndoToast } from './ui/UndoToast';
import { TooltipButton } from './ui/TooltipButton';
import { OwnRecipeDialog } from './OwnRecipeDialog';
import { PhotoPrivacyDialog } from './PhotoPrivacyDialog';

/**
 * Label for a brought-along recipe: its first non-empty line, which is where
 * every transcription and every pasted recipe puts the title. Derived at
 * render rather than stored, so correcting the text corrects the chip.
 */
const ownRecipeTitle = (recipe: string): string => {
    const firstLine = recipe.split('\n').map(line => line.trim()).find(Boolean) ?? '';
    return firstLine.length > 40 ? `${firstLine.slice(0, 40)}…` : firstLine;
};

export interface SettingsPanelRef {
    flushPendingInput: () => string | null;
    flushPendingPlannedRecipe: () => string | null;
}

interface SettingsPanelProps {
    optionsMinimized: boolean;
    setOptionsMinimized: (minimized: boolean) => void;
    loading: boolean;
    handleGenerate: () => void;
    onCancelGenerate: () => void;
    notification: Notification | null;
}

export const SettingsPanel = forwardRef<SettingsPanelRef, SettingsPanelProps>(({
    optionsMinimized,
    setOptionsMinimized,
    loading,
    handleGenerate,
    onCancelGenerate,
    notification
}, ref) => {
    const { diet, setDiet, styleWishes, setStyleWishes, plannedRecipes, setPlannedRecipes, ownRecipes, setOwnRecipes, people, setPeople, meals, setMeals, apiKey, t } = useSettings();
    const [newStyleWish, setNewStyleWish] = useState('');
    const [newPlannedRecipe, setNewPlannedRecipe] = useState('');
    const [showOwnRecipe, setShowOwnRecipe] = useState(false);
    const [ownRecipeAutoCamera, setOwnRecipeAutoCamera] = useState(false);
    const [showPhotoPrivacy, setShowPhotoPrivacy] = useState(false);
    const [expandedOwnRecipe, setExpandedOwnRecipe] = useState<string | null>(null);
    const [photoPrivacyAck, setPhotoPrivacyAck] = useLocalStorage<boolean>(STORAGE_KEYS.PHOTO_PRIVACY_ACK, false);

    const flushPendingInput = (): string | null => {
        const trimmed = newStyleWish.trim();
        if (!trimmed) return null;

        setNewStyleWish('');

        if (styleWishes.some(wish => wish.toLowerCase() === trimmed.toLowerCase())) return null;

        setStyleWishes([...styleWishes, trimmed]);
        return trimmed;
    };

    const flushPendingPlannedRecipe = (): string | null => {
        const trimmed = newPlannedRecipe.trim();
        if (!trimmed) return null;

        setNewPlannedRecipe('');

        if (plannedRecipes.some(recipe => recipe.toLowerCase() === trimmed.toLowerCase())) return null;

        setPlannedRecipes([...plannedRecipes, trimmed]);
        return trimmed;
    };

    useImperativeHandle(ref, () => ({
        flushPendingInput,
        flushPendingPlannedRecipe,
    }));

    const handleAddStyleWish = (e: React.FormEvent) => {
        e.preventDefault();
        flushPendingInput();
    };

    const handleRemoveStyleWish = (wishToRemove: string) => {
        setStyleWishes(styleWishes.filter(wish => wish !== wishToRemove));
    };

    const handleAddPlannedRecipe = (e: React.FormEvent) => {
        e.preventDefault();
        flushPendingPlannedRecipe();
    };

    const handleRemovePlannedRecipe = (recipeToRemove: string) => {
        setPlannedRecipes(plannedRecipes.filter(recipe => recipe !== recipeToRemove));
    };

    // The photo consent is settled here rather than inside OwnRecipeDialog, so
    // the two dialogs never stack: the exposure is the same one the pantry
    // camera asks about, so a user who accepted it once is not asked again.
    const handleOwnRecipeClick = () => {
        if (apiKey && !photoPrivacyAck) {
            setShowPhotoPrivacy(true);
            return;
        }
        setOwnRecipeAutoCamera(!!apiKey);
        setShowOwnRecipe(true);
    };

    const handlePhotoPrivacyAccept = () => {
        setPhotoPrivacyAck(true);
        setShowPhotoPrivacy(false);
        setOwnRecipeAutoCamera(true);
        setShowOwnRecipe(true);
    };

    const handleAddOwnRecipe = (recipe: string) => {
        setShowOwnRecipe(false);
        if (ownRecipes.includes(recipe)) return;
        setOwnRecipes([...ownRecipes, recipe]);
    };

    const handleRemoveOwnRecipe = (recipeToRemove: string) => {
        setOwnRecipes(ownRecipes.filter(recipe => recipe !== recipeToRemove));
        setExpandedOwnRecipe(prev => (prev === recipeToRemove ? null : prev));
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
                            aria-label={`${optionsMinimized ? t.a11y.expand : t.a11y.collapse}: ${t.diet}`}
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
                                    className="w-8 h-8 flex items-center justify-center rounded bg-primary hover:bg-primary-hover text-text-on-primary shadow-sm transition-colors shrink-0"
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
                                            className="text-danger hover:text-danger-text hover:bg-danger/10 rounded-full p-0.5 transition-colors"
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

                        {/* Planned Recipes */}
                        <div className="flex flex-col items-start gap-3">
                            <div className="flex items-center gap-3">
                                <NotepadText className="text-secondary" size={24} />
                                <span>{t.plannedRecipes}</span>
                            </div>
                            <form onSubmit={handleAddPlannedRecipe} className="flex items-center gap-2 w-full">
                                <input
                                    id="planned-recipes-input"
                                    type="text"
                                    value={newPlannedRecipe}
                                    onChange={(e) => setNewPlannedRecipe(e.target.value)}
                                    placeholder={t.plannedRecipesPlaceholder}
                                    maxLength={VALIDATION.MAX_INPUT_LENGTH}
                                    className="input-field-sm bg-white/50 dark:bg-black/20 border-[var(--glass-border)] flex-1"
                                    aria-label={t.plannedRecipesPlaceholder}
                                />
                                <button
                                    type="submit"
                                    className="w-8 h-8 flex items-center justify-center rounded bg-primary hover:bg-primary-hover text-text-on-primary shadow-sm transition-colors shrink-0"
                                    aria-label={t.add}
                                >
                                    <Plus size={18} />
                                </button>
                                {/* A whole recipe is the same request as a dish
                                    name — it fills one of the meals — so it is
                                    entered from this row rather than a section
                                    of its own. The camera leads where a key can
                                    read a page; without one, the text stays. */}
                                <TooltipButton
                                    onClick={handleOwnRecipeClick}
                                    icon={apiKey ? <Camera size={18} /> : <PencilLine size={18} />}
                                    tooltip={apiKey ? t.ownRecipe.cameraAriaLabel : t.ownRecipe.writeAriaLabel}
                                    ariaLabel={apiKey ? t.ownRecipe.cameraAriaLabel : t.ownRecipe.writeAriaLabel}
                                    className="shrink-0"
                                />
                            </form>
                            <div className="flex flex-wrap gap-2 w-full">
                                {plannedRecipes.length === 0 && ownRecipes.length === 0 && (
                                    <div className="text-text-muted text-center py-2 italic w-full text-sm">
                                        {t.noPlannedRecipes}
                                    </div>
                                )}
                                {ownRecipes.map((recipe) => (
                                    <div key={recipe} className="flex flex-row items-center gap-1 px-2 py-0.5 rounded-full border border-border-base bg-bg-surface shadow-sm hover:border-border-hover transition-colors">
                                        <ScrollText size={12} className="text-secondary shrink-0" aria-hidden="true" />
                                        <button
                                            type="button"
                                            onClick={() => setExpandedOwnRecipe(prev => (prev === recipe ? null : recipe))}
                                            className="font-medium text-xs text-text-main"
                                            aria-expanded={expandedOwnRecipe === recipe}
                                            aria-label={`${t.ownRecipe.previewAriaLabel}: ${ownRecipeTitle(recipe)}`}
                                        >
                                            {ownRecipeTitle(recipe)}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOwnRecipe(recipe)}
                                            className="text-danger hover:text-danger-text hover:bg-danger/10 rounded-full p-0.5 transition-colors"
                                            aria-label={`${t.ownRecipe.removeAriaLabel}: ${ownRecipeTitle(recipe)}`}
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                ))}
                                {plannedRecipes.map((recipe) => (
                                    <div key={recipe} className="flex flex-row items-center gap-1 px-2 py-0.5 rounded-full border border-border-base bg-bg-surface shadow-sm hover:border-border-hover transition-colors">
                                        <span className="font-medium text-xs text-text-main">{recipe}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePlannedRecipe(recipe)}
                                            className="text-danger hover:text-danger-text hover:bg-danger/10 rounded-full p-0.5 transition-colors"
                                            aria-label={t.remove}
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {expandedOwnRecipe !== null && (
                                <pre className="w-full max-h-48 overflow-y-auto bg-white/30 dark:bg-black/20 rounded-lg p-3 text-xs text-text-base whitespace-pre-wrap font-sans">
                                    {expandedOwnRecipe}
                                </pre>
                            )}
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

            {/* Rendered whether or not a run is in flight: a live region only
                announces changes to text it already had, so one that appears
                together with "planning" stays silent. */}
            <p className="sr-only" role="status">{loading ? t.planning : ''}</p>

            <button
                onClick={loading ? onCancelGenerate : handleGenerate}
                aria-busy={loading}
                aria-label={loading ? t.cancelGeneration : undefined}
                className="btn btn-primary w-full py-4 text-lg rounded-xl shadow-lg shadow-primary/20"
            >
                {loading ? (
                    <>
                        <span
                            className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"
                            aria-hidden="true"
                        ></span>
                        <span>{t.planning}</span>
                        <span className="mx-2 opacity-60" aria-hidden="true">·</span>
                        <X size={18} aria-hidden="true" /> {t.cancel}
                    </>
                ) : (
                    <>
                        <Sparkles size={20} /> {t.generate}
                    </>
                )}
            </button>

            {notification && (notification.anchor === undefined || notification.anchor === 'generate') && (
                <UndoToast notification={notification} />
            )}

            {showPhotoPrivacy && (
                <PhotoPrivacyDialog
                    purpose="recipe"
                    onAccept={handlePhotoPrivacyAccept}
                    onCancel={() => setShowPhotoPrivacy(false)}
                />
            )}

            {showOwnRecipe && (
                <OwnRecipeDialog
                    autoStartCamera={ownRecipeAutoCamera}
                    onSubmit={handleAddOwnRecipe}
                    onCancel={() => setShowOwnRecipe(false)}
                />
            )}
        </>
    );
});

SettingsPanel.displayName = 'SettingsPanel';
