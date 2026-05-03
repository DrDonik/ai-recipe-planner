import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { generateRecipeImage } from '../services/llm';
import {
    deleteRecipeImage,
    getAllRecipeImageIds,
    getRecipeImage,
    pruneRecipeImages,
    setRecipeImage,
} from '../utils/imageStore';
import type { Recipe } from '../types';

/**
 * Manages on-demand image generation and persistence for the recipes in the
 * current meal plan.
 *
 * Image bytes live in IndexedDB (as Blobs) rather than on the recipe object
 * in localStorage — base64 data URLs would blow past Safari/iPadOS's ~5 MB
 * localStorage cap after just a few generations. The hook exposes an object
 * URL per recipe id (created from the persisted Blob) and revokes URLs when
 * they are no longer needed.
 *
 * Loading and error state are transient (in memory only). Images are
 * intentionally device-local: they are not part of the Gist sync payload
 * (cheap to regenerate, expensive to ship) and not part of share URLs.
 */
export function useRecipeImage(recipeIds: readonly string[]) {
    const { apiKey, t } = useSettings();
    const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
    const [errors, setErrors] = useState<Record<string, string>>({});
    // Synchronous in-flight tracking. Using a ref (rather than reading
    // `loadingIds` inside `generate`) keeps `generate` referentially stable
    // across loading-state flips so it doesn't churn `RecipeCard` props, and
    // a rapid double-click can't slip past a not-yet-applied state update.
    const inFlightRef = useRef<Set<string>>(new Set());
    // Mirror of imageUrls so the unmount cleanup can revoke without depending
    // on the latest render's state snapshot.
    const urlMapRef = useRef<Record<string, string>>({});

    const replaceUrl = useCallback((recipeId: string, blob: Blob | null) => {
        const previous = urlMapRef.current[recipeId];
        if (previous) URL.revokeObjectURL(previous);
        const next = blob ? URL.createObjectURL(blob) : undefined;
        const nextMap = { ...urlMapRef.current };
        if (next) {
            nextMap[recipeId] = next;
        } else {
            delete nextMap[recipeId];
        }
        urlMapRef.current = nextMap;
        setImageUrls(nextMap);
    }, []);

    // Stable key so the load effect re-runs only when the *set* of ids
    // changes, not on every render that produces a new array reference.
    const idsKey = useMemo(() => [...recipeIds].sort().join('\n'), [recipeIds]);

    // Load images from IndexedDB for the current recipe ids, and prune any
    // orphaned entries (recipes that no longer exist).
    useEffect(() => {
        let cancelled = false;
        const sync = async () => {
            try {
                const storedIds = new Set(await getAllRecipeImageIds());
                if (cancelled) return;
                const wanted = new Set(recipeIds);

                // Identify orphans we want to revoke. Re-checked at commit
                // time against the latest urlMapRef in case `remove()` got
                // there first.
                const orphanIds = new Set<string>();
                for (const id of Object.keys(urlMapRef.current)) {
                    if (!wanted.has(id)) orphanIds.add(id);
                }

                // Fetch any wanted-but-missing image blobs. URL creation is
                // deferred to commit time so we don't leak a URL if a
                // concurrent `generate()` produced one for the same id while
                // we were awaiting `getRecipeImage`.
                const additions = new Map<string, Blob>();
                for (const id of recipeIds) {
                    if (cancelled) return;
                    if (!storedIds.has(id)) continue;
                    if (urlMapRef.current[id] || additions.has(id)) continue;
                    const blob = await getRecipeImage(id);
                    if (cancelled || !blob) continue;
                    additions.set(id, blob);
                }

                // Synchronous commit. Read the latest urlMapRef *now* (not
                // an early snapshot) and merge our delta into it. Doing the
                // read-merge-write in one synchronous block prevents a
                // concurrent `generate()`'s `replaceUrl()` from being
                // clobbered by a stale snapshot. JS is single-threaded, so
                // nothing can interleave between these statements.
                if (orphanIds.size > 0 || additions.size > 0) {
                    const latest = urlMapRef.current;
                    const merged: Record<string, string> = {};
                    let changed = false;
                    for (const [id, url] of Object.entries(latest)) {
                        if (orphanIds.has(id)) {
                            URL.revokeObjectURL(url);
                            changed = true;
                        } else {
                            merged[id] = url;
                        }
                    }
                    for (const [id, blob] of additions) {
                        // generate() may have raced us — keep its URL.
                        if (merged[id]) continue;
                        merged[id] = URL.createObjectURL(blob);
                        changed = true;
                    }
                    if (changed) {
                        urlMapRef.current = merged;
                        setImageUrls(merged);
                    }
                }

                // Prune orphaned IDB entries. Best-effort.
                await pruneRecipeImages(wanted);
            } catch {
                // IndexedDB unavailable — degrade silently (no images loaded).
            }
        };
        void sync();
        return () => {
            cancelled = true;
        };
        // `idsKey` already encodes the content of `recipeIds`. Including
        // `recipeIds` itself would re-fire the effect on every meal-plan
        // setter (e.g. an identical-content sync pull replaces the ref but
        // not the contents) and undo the stabilization the memo is meant to
        // provide. Reading `recipeIds` inside is safe because it's always
        // in sync with `idsKey` whenever `idsKey` changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idsKey]);

    // Revoke any object URLs the hook owns when it unmounts so the browser
    // can release the underlying blobs.
    useEffect(() => () => {
        for (const url of Object.values(urlMapRef.current)) {
            URL.revokeObjectURL(url);
        }
        urlMapRef.current = {};
    }, []);

    const getImageUrl = useCallback((recipeId: string): string | undefined => {
        return imageUrls[recipeId];
    }, [imageUrls]);

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
            const blob = await generateRecipeImage(apiKey, recipe.title, recipe.ingredients, t.errors);
            await setRecipeImage(recipe.id, blob);
            replaceUrl(recipe.id, blob);
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
    }, [apiKey, replaceUrl, t.errors]);

    const remove = useCallback(async (recipeId: string): Promise<void> => {
        replaceUrl(recipeId, null);
        setErrors(prev => {
            if (!(recipeId in prev)) return prev;
            const next = { ...prev };
            delete next[recipeId];
            return next;
        });
        try {
            await deleteRecipeImage(recipeId);
        } catch {
            // Best effort — UI already shows the image as removed.
        }
    }, [replaceUrl]);

    const clearError = useCallback((recipeId: string) => {
        setErrors(prev => {
            if (!(recipeId in prev)) return prev;
            const next = { ...prev };
            delete next[recipeId];
            return next;
        });
    }, []);

    return useMemo(
        () => ({ getImageUrl, isLoading, getError, clearError, generate, remove }),
        [getImageUrl, isLoading, getError, clearError, generate, remove],
    );
}
