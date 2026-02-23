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

    useEffect(() => {
        try {
            setPersistError(false);
            if (state === null || state === undefined) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(state));
            }
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

    useEffect(() => {
        try {
            setPersistError(false);
            localStorage.setItem(key, state);
        } catch (error) {
            setPersistError(true);
            console.error(`Error saving localStorage key "${key}":`, error);
        }
    }, [key, state]);

    return [state, setState, persistError] as const;
}
