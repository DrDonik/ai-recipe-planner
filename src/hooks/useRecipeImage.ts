import { useCallback, useMemo, useRef, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { generateRecipeImage } from '../services/llm';
import type { Recipe } from '../types';

/**
 * Manages on-demand image generation for individual recipes.
 *
 * State (loading + per-recipe error) is transient and lives only in memory.
 * The generated image itself is persisted on the recipe via `onImageGenerated`,
 * which the caller wires to its meal-plan setter.
 */
export function useRecipeImage(onImageGenerated: (recipeId: string, imageDataUrl: string) => void) {
    const { apiKey, t } = useSettings();
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
    const [errors, setErrors] = useState<Record<string, string>>({});
    // Synchronous in-flight tracking. Using a ref (rather than reading
    // `loadingIds` in `generate`'s deps) avoids two issues: (1) `generate` no
    // longer needs `loadingIds` in its dep array, so it stays stable across
    // loading-state flips and doesn't churn `RecipeCard` props; (2) the check
    // is synchronous, so a rapid double-click can't slip past a not-yet-applied
    // state update and fire two redundant requests.
    const inFlightRef = useRef<Set<string>>(new Set());

    const isLoading = useCallback((recipeId: string): boolean => {
        return loadingIds.has(recipeId);
    }, [loadingIds]);

    const getError = useCallback((recipeId: string): string | undefined => {
        return errors[recipeId];
    }, [errors]);

    const generate = useCallback(async (recipe: Recipe): Promise<void> => {
        if (inFlightRef.current.has(recipe.id)) return;
        inFlightRef.current.add(recipe.id);

        setLoadingIds(prev => {
            const next = new Set(prev);
            next.add(recipe.id);
            return next;
        });
        setErrors(prev => {
            if (!(recipe.id in prev)) return prev;
            const next = { ...prev };
            delete next[recipe.id];
            return next;
        });

        try {
            const dataUrl = await generateRecipeImage(apiKey, recipe.title, recipe.ingredients, t.errors);
            onImageGenerated(recipe.id, dataUrl);
        } catch (err) {
            const message = err instanceof Error ? err.message : t.errors.unexpectedError;
            setErrors(prev => ({ ...prev, [recipe.id]: message }));
        } finally {
            inFlightRef.current.delete(recipe.id);
            setLoadingIds(prev => {
                const next = new Set(prev);
                next.delete(recipe.id);
                return next;
            });
        }
    }, [apiKey, onImageGenerated, t.errors]);

    const clearError = useCallback((recipeId: string) => {
        setErrors(prev => {
            if (!(recipeId in prev)) return prev;
            const next = { ...prev };
            delete next[recipeId];
            return next;
        });
    }, []);

    return useMemo(
        () => ({ generate, isLoading, getError, clearError }),
        [generate, isLoading, getError, clearError],
    );
}
