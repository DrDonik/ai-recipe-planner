import { useState, useEffect } from 'react';

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

    // Effect syncs React state to localStorage (external system).
    // setPersistError reflects whether that sync succeeded — this is
    // the "update state from external system result" pattern, not a
    // cascading-render issue, so the lint suppression is intentional.
    useEffect(() => {
        try {
            if (state === null || state === undefined) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(state));
            }
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPersistError(false);
        } catch (error) {
            setPersistError(true);
            console.error(`Error saving localStorage key "${key}":`, error);
        }
    }, [key, state]);

    return [state, setState, persistError] as const;
}

export function useStringLocalStorage(key: string, initialValue: string) {
    const [state, setState] = useState<string>(() => {
        return localStorage.getItem(key) || initialValue;
    });
    const [persistError, setPersistError] = useState(false);

    // See comment in useLocalStorage above for lint suppression rationale.
    useEffect(() => {
        try {
            localStorage.setItem(key, state);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPersistError(false);
        } catch (error) {
            setPersistError(true);
            console.error(`Error saving localStorage key "${key}":`, error);
        }
    }, [key, state]);

    return [state, setState, persistError] as const;
}
