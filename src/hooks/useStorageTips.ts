import { useCallback, useState } from 'react';
import { useLocalStorage, writeLocalStorageExternal } from './useLocalStorage';
import { useSettings } from '../contexts/SettingsContext';
import { fetchStorageTip } from '../services/llm';
import { STORAGE_KEYS } from '../constants';

const buildKey = (language: string, name: string) => `${language}:${name.trim().toLowerCase()}`;

export function useStorageTips() {
    const { apiKey, language, t } = useSettings();
    const [cache, setCache] = useLocalStorage<Record<string, string>>(STORAGE_KEYS.STORAGE_TIPS_CACHE, {});
    const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const hasAnyTips = Object.keys(cache || {}).length > 0;

    const getTip = useCallback((name: string): string | undefined => {
        return cache[buildKey(language, name)];
    }, [cache, language]);

    const isLoading = useCallback((name: string): boolean => {
        return loadingKeys.has(buildKey(language, name));
    }, [loadingKeys, language]);

    const getError = useCallback((name: string): string | undefined => {
        return errors[buildKey(language, name)];
    }, [errors, language]);

    const fetchTip = useCallback(async (name: string): Promise<void> => {
        const key = buildKey(language, name);
        if (cache[key] || loadingKeys.has(key)) return;

        setLoadingKeys(prev => {
            const next = new Set(prev);
            next.add(key);
            return next;
        });
        setErrors(prev => {
            if (!(key in prev)) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });

        try {
            const tip = await fetchStorageTip(apiKey, name, language, t.errors);
            setCache(prev => ({ ...prev, [key]: tip }));
        } catch (err) {
            const message = err instanceof Error ? err.message : t.errors.unexpectedError;
            setErrors(prev => ({ ...prev, [key]: message }));
        } finally {
            setLoadingKeys(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    }, [apiKey, language, cache, loadingKeys, setCache, t.errors]);

    const clearAll = useCallback((): Record<string, string> => {
        const backup = cache;
        setCache({});
        writeLocalStorageExternal(STORAGE_KEYS.STORAGE_TIPS_CACHE, undefined);
        setErrors({});
        setLoadingKeys(new Set());
        return backup;
    }, [cache, setCache]);

    const restoreAll = useCallback((backup: Record<string, string>) => {
        setCache(backup);
        writeLocalStorageExternal(STORAGE_KEYS.STORAGE_TIPS_CACHE, backup);
    }, [setCache]);

    return { getTip, fetchTip, isLoading, getError, clearAll, restoreAll, hasAnyTips };
}
