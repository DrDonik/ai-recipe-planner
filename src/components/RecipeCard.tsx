import React, { useState, useMemo, useCallback } from 'react';
import { Clock, ChefHat, AlertCircle, Maximize, Sun, SunDim, Trash2, ListChecks, X, Lightbulb, ChevronUp, ChevronDown, Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Recipe, Notification } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { UndoToast } from './ui/UndoToast';

interface RecipeCardProps {
    recipe: Recipe;
    index: number;
    showOpenInNewTab?: boolean;
    isStandalone?: boolean;
    wakeLock?: {
        isSupported: boolean;
        isActive: boolean;
        toggle: () => void;
    };
    onDelete?: () => void;
    onViewSingle?: () => void;
    onClose?: () => void;
    missingIngredientsMinimized?: boolean;
    onToggleMissingIngredientsMinimize?: () => void;
    /**
     * When provided, the card shows a Generate-image button. Pass undefined
     * to hide the feature (copy-paste mode, shared standalone views, or
     * when no API key is configured).
     */
    onGenerateImage?: () => void;
    onRemoveImage?: () => void;
    /**
     * When provided, the card shows a Replace button that regenerates this
     * single recipe. Passed only in direct-API mode (mirrors image generation).
     */
    onReplace?: () => void;
    isImageLoading?: boolean;
    imageError?: string;
    /**
     * Object URL for the recipe's persisted image (created from a Blob in
     * IndexedDB). Undefined when no image has been generated yet.
     */
    imageUrl?: string;
    /**
     * When true, the card renders only an undo toast in place of its content
     * so the slot stays in the grid during the 5s undo window.
     */
    pendingDelete?: boolean;
    deleteNotification?: Notification | null;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, index, showOpenInNewTab = false, isStandalone = false, wakeLock, onDelete, onViewSingle, onClose, missingIngredientsMinimized = false, onToggleMissingIngredientsMinimize, onGenerateImage, onRemoveImage, onReplace, isImageLoading = false, imageError, imageUrl, pendingDelete = false, deleteNotification }) => {
    const { t } = useSettings();
    const [struckIngredients, setStruckIngredients] = useState<Set<number>>(new Set());
    const [activeStep, setActiveStep] = useState<number | null>(null);

    const toggleIngredient = useCallback((idx: number) => {
        setStruckIngredients(prev => {
            const next = new Set(prev);
            if (next.has(idx)) {
                next.delete(idx);
            } else {
                next.add(idx);
            }
            return next;
        });
    }, []);

    const toggleStepHighlight = useCallback((idx: number) => {
        setActiveStep(prev => prev === idx ? null : idx);
    }, []);

    // Memoize the JSON-LD schema to avoid regeneration on every render
    // Wrapped in try-catch to prevent malformed recipe data from crashing the component
    const schemaJson = useMemo(() => {
        try {
            const schema: Record<string, unknown> = {
                "@context": "https://schema.org",
                "@type": "Recipe",
                "name": recipe.title,
                "description": `A recipe for ${recipe.title}`,
                "recipeIngredient": recipe.ingredients.map(i => `${i.amount} ${i.item}`),
                "recipeInstructions": recipe.instructions.map(step => ({
                    "@type": "HowToStep",
                    "text": step
                }))
            };
            // Add cookTime if available (e.g., "30 min" -> "PT30M")
            if (recipe.time) {
                const minutes = recipe.time.match(/(\d+)/)?.[1];
                if (minutes) {
                    schema.cookTime = `PT${minutes}M`;
                }
            }
            // Add nutrition info if available
            if (recipe.nutrition) {
                schema.nutrition = {
                    "@type": "NutritionInformation",
                    "calories": `${recipe.nutrition.calories} calories`,
                    "carbohydrateContent": `${recipe.nutrition.carbs} g`,
                    "fatContent": `${recipe.nutrition.fat} g`,
                    "proteinContent": `${recipe.nutrition.protein} g`
                };
            }
            // Escape </script> to prevent XSS when recipe data contains malicious strings
            return JSON.stringify(schema).replace(/<\/script>/gi, '<\\/script>');
        } catch (error) {
            // Log error for debugging but return null to prevent crash
            console.error('Failed to generate JSON-LD schema for recipe:', recipe.title, error);
            return null;
        }
    }, [recipe]);


    // Hold the slot for the full 5s deletion window even if the toast is
    // displaced by another notification — otherwise the card would flash back
    // into view before the timer fires.
    if (pendingDelete) {
        return (
            <motion.div
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8 flex flex-col h-full relative shadow-glass"
            >
                {deleteNotification && <UndoToast notification={deleteNotification} />}
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index+1) * 0.1 }}
            className="glass-card p-8 flex flex-col h-full relative hover:border-border-hover transition-colors shadow-glass"
        >
            {schemaJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />}

            <div className="flex items-start justify-between mb-6 gap-4">
                <h3 className={`${isStandalone ? 'text-2xl md:text-3xl' : 'text-2xl'} font-bold leading-tight flex-1`}>
                    {recipe.title}
                </h3>
                <div className="flex items-center gap-2">
                    {showOpenInNewTab && onViewSingle && (
                        <button
                            onClick={onViewSingle}
                            className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-all flex items-center justify-center text-text-muted hover:text-primary"
                            aria-label={t.openFocusView}
                        >
                            <Maximize size={18} />
                        </button>
                    )}

                    {isStandalone && onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/50 hover:bg-white/50 dark:bg-black/20 dark:hover:bg-black/30 rounded-full transition-all text-text-muted hover:text-text-base focus:outline-none focus:ring-2 focus:ring-primary shrink-0"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            <div className={`flex items-center justify-between mb-4 ${isStandalone ? 'text-base' : 'text-sm'} font-medium`}>
                <div className={`flex items-center gap-2 text-primary bg-primary/10 px-3 rounded-full ${isStandalone ? 'h-9' : 'h-8'}`}>
                    <Clock size={16} />
                    {recipe.time}
                </div>
                <div className="flex items-center gap-2">
                    {onGenerateImage && !imageUrl && !isImageLoading && !imageError && (
                        <button
                            onClick={onGenerateImage}
                            className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-all flex items-center justify-center text-text-muted hover:text-primary"
                            aria-label={t.recipeImage.generate}
                        >
                            <ImageIcon size={18} />
                        </button>
                    )}
                    {wakeLock?.isSupported && isStandalone && (
                        <button
                            onClick={wakeLock.toggle}
                            className={`rounded-full transition-all flex items-center justify-center h-9 w-9 ${
                                wakeLock.isActive
                                    ? 'bg-primary/20 text-primary hover:bg-primary/30'
                                    : 'bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 text-text-muted hover:text-primary'
                            }`}
                            aria-label={wakeLock.isActive ? t.screenKeptOn : t.keepScreenOn}
                            aria-pressed={wakeLock.isActive}
                        >
                            {wakeLock.isActive ? <Sun size={16} /> : <SunDim size={16} />}
                        </button>
                    )}
                    {onReplace && (
                        <button
                            onClick={onReplace}
                            className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-all flex items-center justify-center text-text-muted hover:text-primary"
                            aria-label={t.replaceRecipe.button}
                        >
                            <RefreshCw size={18} />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="p-2 bg-white/50 hover:bg-red-100 dark:bg-black/20 dark:hover:bg-red-900/30 rounded-full transition-all flex items-center justify-center text-red-400 hover:text-red-500"
                            aria-label={t.deleteRecipe}
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            {(imageUrl || isImageLoading || imageError) && (
                <div className="mb-6 relative rounded-2xl overflow-hidden bg-white/30 dark:bg-black/20 border border-border-base/30">
                    {imageUrl && (
                        <motion.img
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4 }}
                            src={imageUrl}
                            alt={recipe.title}
                            className="w-full aspect-[4/3] object-cover"
                        />
                    )}
                    {isImageLoading && !imageUrl && (
                        <div className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-3 text-text-muted">
                            <Loader2 size={32} className="animate-spin text-primary" />
                            <span className="text-sm">{t.recipeImage.generating}</span>
                        </div>
                    )}
                    {imageError && !imageUrl && !isImageLoading && (
                        <div className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-3 text-text-muted p-6 text-center">
                            <AlertCircle size={28} className="text-amber-500" />
                            <span className="text-xs">{imageError}</span>
                            {onGenerateImage && (
                                <button
                                    onClick={onGenerateImage}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                                >
                                    <RefreshCw size={14} />
                                    {t.recipeImage.retry}
                                </button>
                            )}
                        </div>
                    )}
                    {imageUrl && onRemoveImage && (
                        <button
                            onClick={onRemoveImage}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                            aria-label={t.recipeImage.remove}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            )}

            <div className="flex flex-col gap-8 flex-grow">
                <section className={isStandalone ? '' : 'hidden md:block'}>
                    <div className="flex items-center gap-2 mb-4 text-secondary">
                        <ListChecks size={20} />
                        <h4 className={`font-bold uppercase tracking-wider ${isStandalone ? 'text-sm' : 'text-xs'}`}>{t.ingredients}</h4>
                    </div>
                    <ul className={isStandalone ? 'text-base' : 'text-sm'} role="list">
                        {recipe.ingredients.map((ing, idx) => {
                            const ingredientKey = `${ing.item}-${ing.amount}-${idx}`;
                            const isStruck = struckIngredients.has(idx);

                            return (
                                <li
                                    key={ingredientKey}
                                    role="button"
                                    tabIndex={0}
                                    className="flex flex-row items-center justify-between border-b border-dashed border-[var(--glass-border)] py-0.5 last:border-0 gap-3 cursor-pointer group/ing focus:outline-none focus:bg-primary/5 rounded"
                                    onClick={() => toggleIngredient(idx)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleIngredient(idx); }}}
                                    aria-pressed={isStruck}
                                    aria-label={`${ing.item}, ${ing.amount}${isStruck ? ' (crossed off)' : ''}`}
                                >
                                    <span className={`${isStandalone ? 'text-base' : 'text-sm'} transition-all ${isStruck
                                        ? "line-through opacity-50 text-text-muted"
                                        : "text-text-main"
                                        } flex-1`}>
                                        {ing.item}
                                    </span>
                                    <span className={`text-text-muted font-mono ${isStandalone ? 'text-sm' : 'text-xs'} whitespace-nowrap bg-white/40 dark:bg-black/20 px-2 py-0.5 rounded transition-opacity ${isStruck ? "opacity-30" : ""}`}>
                                        {ing.amount}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                    <section className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
                        <div className={`flex items-center justify-between ${!missingIngredientsMinimized ? 'mb-3' : ''}`}>
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                <AlertCircle size={18} />
                                <h4 className="font-bold uppercase tracking-wider text-xs">{t.needToBuy}</h4>
                            </div>
                            {onToggleMissingIngredientsMinimize && (
                                <button
                                    onClick={onToggleMissingIngredientsMinimize}
                                    className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center justify-center"
                                    aria-label={missingIngredientsMinimized ? 'Expand' : 'Collapse'}
                                    aria-expanded={!missingIngredientsMinimized}
                                >
                                    {missingIngredientsMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                </button>
                            )}
                        </div>
                        {!missingIngredientsMinimized && (
                            <div className="flex flex-wrap gap-2">
                                {recipe.missingIngredients.map((ing, idx) => (
                                    <span key={`missing-${ing.item}-${ing.amount}-${idx}`} className="bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-semibold border border-amber-500/10">
                                        {ing.amount} {ing.item}
                                    </span>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                <section className={isStandalone ? '' : 'hidden md:block'}>
                    <div className="flex items-center gap-2 mb-4 text-secondary">
                        <ChefHat size={20} />
                        <h4 className={`font-bold uppercase tracking-wider ${isStandalone ? 'text-sm' : 'text-xs'}`}>{t.instructions}</h4>
                    </div>
                    <ol className={`list-decimal list-inside space-y-4 ${isStandalone ? 'text-base' : 'text-sm'} opacity-90`}>
                        {recipe.instructions.map((step, i) => (
                            <li
                                key={`step-${i}-${step.slice(0, 20)}`}
                                tabIndex={0}
                                className={`pl-1 marker:text-primary marker:font-bold cursor-pointer transition-all focus:outline-none focus:bg-primary/5 rounded ${activeStep === i ? 'instruction-step-active' : ''}`}
                                onClick={() => toggleStepHighlight(i)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStepHighlight(i); }}}
                                aria-current={activeStep === i ? 'step' : undefined}
                            >
                                {step}
                            </li>
                        ))}
                    </ol>
                </section>

                {recipe.nutrition && (
                    <div className={`pt-4 border-t border-border-base/30 ${isStandalone ? '' : 'hidden md:block'}`}>
                        <div className="flex items-center justify-between text-text-muted text-xs">
                            <span className="opacity-60">{t.nutritionPerServing}</span>
                            <div className="flex gap-3">
                                <span>{recipe.nutrition.calories} {t.calories}</span>
                                <span>{recipe.nutrition.carbs}g {t.carbs}</span>
                                <span>{recipe.nutrition.fat}g {t.fat}</span>
                                <span>{recipe.nutrition.protein}g {t.protein}</span>
                            </div>
                        </div>
                    </div>
                )}

                {isStandalone && recipe.comments && (
                    <div className="pt-4 border-t border-border-base/30 flex items-start gap-2 text-text-muted text-xs">
                        <Lightbulb size={14} className="shrink-0 mt-0.5 opacity-60" />
                        <span className="opacity-60 italic">{recipe.comments}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
