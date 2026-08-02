import { useCallback, useMemo, useRef, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { chatAboutRecipe, type ChatMessage, type RecipeChatContext } from '../services/llm';
import type { Recipe } from '../types';

/**
 * Per-recipe chat transcripts for the cooking view.
 *
 * Like the cooking timers and the crossed-off ingredients, transcripts live in
 * memory only: they survive closing and reopening the focus view (this hook is
 * mounted at the app root) but intentionally end with the cooking session. They
 * are deliberately kept out of localStorage — old kitchen conversations would
 * otherwise bloat the Gist sync payload for no benefit.
 *
 * Keyed by the recipe's stable identity (`recipe.id ?? recipe.title`), matching
 * how CookingProgressContext keys its state.
 */

export const chatKeyFor = (recipe: Recipe): string => recipe.id ?? recipe.title;

const EMPTY_HISTORY: readonly ChatMessage[] = [];

/** Cap on a single question, mirroring the app's other free-text limits. */
export const MAX_CHAT_INPUT_LENGTH = 500;

export function useRecipeChat() {
    const { apiKey, language, t } = useSettings();
    const [histories, setHistories] = useState<Record<string, ChatMessage[]>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [pendingKey, setPendingKey] = useState<string | null>(null);
    // Synchronous in-flight guard, so a double-tap on Send can't slip past a
    // not-yet-applied state update and fire two requests.
    const inFlightRef = useRef<string | null>(null);
    // Bumped by `clear`. A reply (or error) whose generation is stale belongs
    // to a transcript the user has since wiped, and is dropped — otherwise it
    // would reappear as a lone answer with no question attached.
    const generationRef = useRef(0);

    const getMessages = useCallback(
        (key: string): readonly ChatMessage[] => histories[key] ?? EMPTY_HISTORY,
        [histories]
    );

    const isPending = useCallback((key: string): boolean => pendingKey === key, [pendingKey]);

    const getError = useCallback((key: string): string | undefined => errors[key], [errors]);

    /**
     * Sends `history` (which must end with the user turn to answer) and appends
     * the reply. On failure the transcript is left as-is — the unanswered user
     * message stays visible and `retry` can resend it unchanged.
     */
    const run = useCallback(async (
        recipe: Recipe,
        history: ChatMessage[],
        context: RecipeChatContext
    ): Promise<void> => {
        const key = chatKeyFor(recipe);
        if (inFlightRef.current) return;
        inFlightRef.current = key;
        const generation = generationRef.current;
        setPendingKey(key);
        setErrors(prev => {
            if (!(key in prev)) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });

        try {
            const reply = await chatAboutRecipe(apiKey, recipe, history, language, {
                context,
                errorTranslations: t.errors,
            });
            if (generationRef.current !== generation) return;
            setHistories(prev => ({ ...prev, [key]: [...(prev[key] ?? []), { role: 'model', text: reply }] }));
        } catch (err) {
            if (generationRef.current !== generation) return;
            const message = err instanceof Error ? err.message : t.errors.unexpectedError;
            setErrors(prev => ({ ...prev, [key]: message }));
        } finally {
            inFlightRef.current = null;
            setPendingKey(null);
        }
    }, [apiKey, language, t.errors]);

    const send = useCallback((recipe: Recipe, text: string, context: RecipeChatContext = {}) => {
        const trimmed = text.trim().slice(0, MAX_CHAT_INPUT_LENGTH);
        if (!trimmed || inFlightRef.current) return;
        const key = chatKeyFor(recipe);
        const history: ChatMessage[] = [...(histories[key] ?? []), { role: 'user', text: trimmed }];
        setHistories(prev => ({ ...prev, [key]: history }));
        void run(recipe, history, context);
    }, [histories, run]);

    /** Resends the last unanswered user turn after a failure. */
    const retry = useCallback((recipe: Recipe, context: RecipeChatContext = {}) => {
        const key = chatKeyFor(recipe);
        const history = histories[key];
        if (!history?.length || history[history.length - 1].role !== 'user') return;
        void run(recipe, history, context);
    }, [histories, run]);

    const clear = useCallback((key: string) => {
        generationRef.current += 1;
        setHistories(prev => {
            if (!(key in prev)) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setErrors(prev => {
            if (!(key in prev)) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, []);

    return useMemo(
        () => ({ getMessages, isPending, getError, send, retry, clear }),
        [getMessages, isPending, getError, send, retry, clear]
    );
}

export type RecipeChatController = ReturnType<typeof useRecipeChat>;
