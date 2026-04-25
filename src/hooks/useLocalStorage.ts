import { useState, useEffect } from 'react';

/**
 * Module-local event bus: every successful write from useLocalStorage is
 * published here so that cross-cutting consumers (e.g. Gist sync) can react
 * to changes without each call-site being refactored.
 *
 * Events carry a `source` so consumers can distinguish writes that originated
 * from a useLocalStorage setter (`'internal'`) from writes performed directly
 * against localStorage by other code paths such as the Gist-sync apply
 * (`'external'`). Internal writes drive sync push; external writes drive the
 * hook-side state refresh that lets the UI re-render after sync overwrites
 * localStorage.
 *
 * The browser's own `storage` event only fires in OTHER tabs, so it cannot
 * be used for same-tab change detection.
 */
export type LocalStorageChangeSource = 'internal' | 'external';
export type LocalStorageChangeListener = (event: {
    key: string;
    value: unknown;
    source: LocalStorageChangeSource;
}) => void;

const listeners = new Set<LocalStorageChangeListener>();

export const subscribeToLocalStorageChanges = (listener: LocalStorageChangeListener): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

const emitLocalStorageChange = (
    key: string,
    value: unknown,
    source: LocalStorageChangeSource,
): void => {
    for (const listener of listeners) {
        try {
            listener({ key, value, source });
        } catch (error) {
            console.error('localStorage change listener threw:', error);
        }
    }
};

/**
 * Performs a localStorage write that originates outside any useLocalStorage
 * hook (e.g. when Gist sync overwrites local state with the remote payload).
 * Mounted useLocalStorage hooks for the same key will pick up the new value
 * via the change-event subscription, so the UI re-renders without a reload.
 *
 * Pass `undefined` to remove the key entirely; mounted hooks will reset to
 * their `initialValue`. Use `null` to explicitly write a JSON `null`.
 */
export const writeLocalStorageExternal = (key: string, value: unknown): void => {
    if (value === undefined) {
        localStorage.removeItem(key);
    } else {
        localStorage.setItem(key, JSON.stringify(value));
    }
    emitLocalStorageChange(key, value, 'external');
};

export function useLocalStorage<T>(key: string, initialValue: T) {
    const [state, setState] = useState<T>(() => {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : initialValue;
        } catch (error) {
            console.error(`Error loading localStorage key "${key}":`, error);
            return initialValue;
        }
    });
    const [persistError, setPersistError] = useState(false);

    // Effect syncs state to localStorage; setPersistError reflects whether
    // that external write succeeded, so the lint suppression is intentional.
    useEffect(() => {
        try {
            const next = (state === null || state === undefined) ? null : JSON.stringify(state);
            const current = localStorage.getItem(key);
            // Idempotent guard: if localStorage already holds this exact value
            // (e.g. we just absorbed an external write from Gist sync), skip
            // the write AND the emit so we don't echo it back as an `internal`
            // event that would trigger a redundant sync push.
            if (current === next) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setPersistError(false);
                return;
            }
            if (next === null) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, next);
            }
            emitLocalStorageChange(key, state, 'internal');
            setPersistError(false);
        } catch (error) {
            setPersistError(true);
            console.error(`Error saving localStorage key "${key}":`, error);
        }
    }, [key, state]);

    // Pick up writes that bypass this hook (sync apply, future imports, etc.)
    // so the component re-renders without requiring a page reload. `undefined`
    // signals "key removed" → reset to initialValue.
    useEffect(() => {
        return subscribeToLocalStorageChanges((event) => {
            if (event.source !== 'external') return;
            if (event.key !== key) return;
            setState((event.value === undefined ? initialValue : event.value) as T);
        });
        // initialValue intentionally excluded: it is only consulted when an
        // external write removes the key, and re-subscribing on every render
        // would defeat the purpose. Treat it as a stable mount-time default.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return [state, setState, persistError] as const;
}
