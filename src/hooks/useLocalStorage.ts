import { useState, useEffect } from 'react';

/**
 * Module-local event bus: every successful write from useLocalStorage is
 * published here so that cross-cutting consumers (e.g. Gist sync) can react
 * to changes without each call-site being refactored.
 *
 * The browser's own `storage` event only fires in OTHER tabs, so it cannot
 * be used for same-tab change detection.
 */
export type LocalStorageChangeListener = (event: { key: string; value: unknown }) => void;

const listeners = new Set<LocalStorageChangeListener>();

export const subscribeToLocalStorageChanges = (listener: LocalStorageChangeListener): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

const emitLocalStorageChange = (key: string, value: unknown): void => {
    for (const listener of listeners) {
        try {
            listener({ key, value });
        } catch (error) {
            console.error('localStorage change listener threw:', error);
        }
    }
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
            if (state === null || state === undefined) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(state));
            }
            emitLocalStorageChange(key, state);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPersistError(false);
        } catch (error) {
            setPersistError(true);
            console.error(`Error saving localStorage key "${key}":`, error);
        }
    }, [key, state]);

    return [state, setState, persistError] as const;
}
