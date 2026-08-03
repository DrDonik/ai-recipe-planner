import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, AlertCircle, RefreshCw, Eraser } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useCookingProgress } from '../contexts/CookingProgressContext';
import { chatKeyFor, MAX_CHAT_INPUT_LENGTH, type RecipeChatController } from '../hooks/useRecipeChat';
import { parseInstruction } from '../utils/parseTimers';
import { TimerChip } from './TimerChip';
import type { RecipeChatContext } from '../services/llm';
import type { Recipe } from '../types';

/**
 * Bottom offset for the chat's floats. The chat sits bottom-left and the timer
 * tray bottom-right; together they need 384 + 288 + gutters ≈ 704px, so below
 * `md` (768px) they would overlap. There, the chat rides on top of the tray's
 * published height instead — the tray keeps the corner, since a running
 * countdown must never be covered by a conversation.
 */
const STACK_ABOVE_TRAY = 'bottom-[calc(1rem_+_var(--timer-tray-height,0px))] md:bottom-4';

interface RecipeChatProps {
    /** The recipe being cooked — handed to the model as context. */
    recipe: Recipe;
    chat: RecipeChatController;
}

/**
 * Floating chat for the recipe focus view: a button in the bottom-left corner
 * that opens a panel for asking questions about the recipe being cooked.
 *
 * The panel is deliberately non-modal (no backdrop, no focus trap) so the
 * recipe behind it stays readable and scrollable — the questions are usually
 * *about* what is on screen. It sits below the timer tray (z-40 vs. z-50) so a
 * running timer is never hidden by a conversation.
 *
 * Only rendered when a Gemini key is configured and direct-API mode is active;
 * see `canChat` in App.tsx.
 */
export const RecipeChat: React.FC<RecipeChatProps> = ({ recipe, chat }) => {
    const { t } = useSettings();
    const { getProgress } = useCookingProgress();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const launcherRef = useRef<HTMLButtonElement>(null);
    // Skips the focus-return on first render, so merely entering the focus view
    // doesn't steal focus from the recipe.
    const wasOpenRef = useRef(false);

    const key = chatKeyFor(recipe);
    const messages = chat.getMessages(key);
    const isPending = chat.isPending(key);
    const error = chat.getError(key);

    // Live cooking state, so "what do I do now?" is answerable without the
    // user restating where they are. Same progress key as the recipe card.
    // Rebuilt each render (it is only ever read inside event handlers, never
    // compared as a dependency), leaving memoization to the React Compiler.
    const { struckIngredients, activeStep } = getProgress(key);
    const context: RecipeChatContext = {
        activeStep,
        struckIngredients: [...struckIngredients]
            .map(idx => recipe.ingredients[idx]?.item)
            .filter((item): item is string => !!item),
    };

    // Keep the newest turn in view as the conversation grows.
    useEffect(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length, isPending, error, isOpen]);

    // Move focus into the panel when it opens, and hand it back to the button
    // when it closes — otherwise Escape or the close button drop focus on
    // document.body and a keyboard user has to tab in from the top of the page.
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        } else if (wasOpenRef.current) {
            launcherRef.current?.focus();
        }
        wasOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const ask = (text: string) => {
        if (isPending) return;
        chat.send(recipe, text, context);
        setInput('');
        inputRef.current?.focus();
    };

    return (
        <>
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        ref={launcherRef}
                        type="button"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => setIsOpen(true)}
                        aria-label={t.recipeChat.open}
                        className={`fixed left-4 z-40 h-14 w-14 rounded-full bg-primary text-text-on-primary shadow-lg hover:bg-primary-hover transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${STACK_ABOVE_TRAY}`}
                    >
                        <MessageCircle size={24} />
                        {messages.length > 0 && (
                            <span
                                aria-hidden="true"
                                className="absolute top-1 right-1 h-3 w-3 rounded-full bg-secondary border-2 border-bg-app"
                            />
                        )}
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={`fixed left-4 z-40 w-96 max-w-[calc(100vw-2rem)] ${STACK_ABOVE_TRAY}`}
                    >
                        <div
                            role="dialog"
                            aria-label={t.recipeChat.title}
                            className="glass-panel !p-0 flex flex-col overflow-hidden shadow-glass"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between gap-2 p-3 border-b border-border-base/30">
                                <div className="flex items-center gap-2 text-text-main min-w-0">
                                    <MessageCircle size={16} className="text-primary shrink-0" />
                                    <span className="text-xs font-bold uppercase tracking-wider truncate">
                                        {t.recipeChat.title}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {messages.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => chat.clear(key)}
                                            aria-label={t.recipeChat.clear}
                                            className="p-1.5 rounded-full transition-colors text-text-muted hover:text-primary hover:bg-white/50 dark:hover:bg-black/30"
                                        >
                                            <Eraser size={16} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        aria-label={t.recipeChat.close}
                                        className="p-1.5 rounded-full transition-colors text-text-muted hover:text-text-main hover:bg-white/50 dark:hover:bg-black/30"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Transcript */}
                            <div
                                ref={listRef}
                                role="log"
                                aria-live="polite"
                                className="flex flex-col gap-3 p-3 max-h-[45vh] overflow-y-auto"
                            >
                                {messages.length === 0 && (
                                    <p className="text-xs text-text-muted leading-relaxed">
                                        {t.recipeChat.intro}
                                    </p>
                                )}

                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                                            message.role === 'user'
                                                ? 'self-end bg-primary/10 text-text-main'
                                                : 'self-start bg-white/60 dark:bg-black/25 border border-border-base/30 text-text-main'
                                        }`}
                                    >
                                        {/* Time phrases in a reply become the same one-tap timers as
                                            in a recipe step. Only replies are parsed — a chip inside
                                            the user's own question would be noise. */}
                                        {message.role === 'model'
                                            ? parseInstruction(message.text).map((segment, si) =>
                                                segment.type === 'timer'
                                                    ? <TimerChip
                                                        key={si}
                                                        sourceId={`${message.id}::${si}`}
                                                        text={segment.text}
                                                        durationMs={segment.durationMs}
                                                        followUpMs={segment.followUpMs}
                                                        label={segment.sentence}
                                                    />
                                                    : <React.Fragment key={si}>{segment.text}</React.Fragment>
                                            )
                                            : message.text}
                                    </div>
                                ))}

                                {isPending && (
                                    <div className="self-start flex items-center gap-2 text-sm text-text-muted">
                                        <Loader2 size={16} className="animate-spin text-primary" />
                                        <span>{t.recipeChat.thinking}</span>
                                    </div>
                                )}

                                {error && !isPending && (
                                    <div role="alert" className="flex items-start gap-2 text-xs text-red-500">
                                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                        <span className="flex-1">{error}</span>
                                        <button
                                            type="button"
                                            onClick={() => chat.retry(recipe, context)}
                                            className="flex items-center gap-1 font-semibold hover:underline shrink-0"
                                        >
                                            <RefreshCw size={12} />
                                            {t.recipeChat.retry}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* One-tap starters — hidden once the conversation is under way,
                                where they would only cost vertical space. */}
                            {messages.length === 0 && (
                                <div className="flex flex-wrap gap-2 px-3 pb-3">
                                    {t.recipeChat.suggestions.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => ask(suggestion)}
                                            disabled={isPending}
                                            className="px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors disabled:opacity-50"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Composer */}
                            <div className="flex items-center gap-2 p-3 border-t border-border-base/30">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    maxLength={MAX_CHAT_INPUT_LENGTH}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (input.trim()) ask(input);
                                        }
                                    }}
                                    placeholder={t.recipeChat.placeholder}
                                    aria-label={t.recipeChat.placeholder}
                                    className="flex-1 min-w-0 bg-white/30 dark:bg-black/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                <button
                                    type="button"
                                    onClick={() => ask(input)}
                                    disabled={isPending || !input.trim()}
                                    aria-label={t.recipeChat.send}
                                    className="p-2 rounded-full bg-primary text-text-on-primary hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
