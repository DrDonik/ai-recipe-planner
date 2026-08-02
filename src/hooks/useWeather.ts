import { useEffect, useRef } from 'react';
import type { KitchenLocation } from '../types';
import { OPEN_METEO, STORAGE_KEYS } from '../constants';
import { useLocalStorage } from './useLocalStorage';
import { fetchForecast, type Forecast } from '../services/weather';

interface CacheEntry {
    fetchedAt: number;
    forecast: Forecast;
}

type WeatherCache = Record<string, CacheEntry>;

/** Coordinates rounded to ~1 km, so the cache survives re-picking the same town. */
const cacheKey = (latitude: number, longitude: number): string =>
    `${latitude.toFixed(2)},${longitude.toFixed(2)}`;

/**
 * Guards against entries written by an earlier shape of `Forecast` (the
 * summary moved from a min/max mix to daytime highs). Such an entry is treated
 * as absent, so it is refetched instead of rendering as `NaN`.
 */
const usableEntry = (entry: CacheEntry | undefined): CacheEntry | undefined => (
    typeof entry?.forecast?.minHighC === 'number' && typeof entry.forecast.maxHighC === 'number'
        ? entry
        : undefined
);

/** Keeps the newest entries only — the cache is a convenience, not a store. */
const evictOldest = (cache: WeatherCache): WeatherCache => {
    const keys = Object.keys(cache);
    if (keys.length <= OPEN_METEO.MAX_CACHE_ENTRIES) return cache;
    const kept = keys
        .sort((a, b) => cache[b].fetchedAt - cache[a].fetchedAt)
        .slice(0, OPEN_METEO.MAX_CACHE_ENTRIES);
    return Object.fromEntries(kept.map(key => [key, cache[key]]));
};

/**
 * Keeps a cached forecast for the active kitchen's location.
 *
 * Prefetches on mount and whenever the location changes, so the forecast is
 * already in memory when the user hits Generate — the copy-paste flow builds
 * its prompt synchronously and could not await a fetch. A cached forecast is
 * served immediately and refreshed in the background once it passes STALE_MS;
 * past MAX_AGE_MS it is dropped rather than used. Every failure is silent:
 * no location, no network or an unexpected response simply means no hint.
 */
export const useWeather = (location: KitchenLocation | undefined): Forecast | undefined => {
    const [cache, setCache] = useLocalStorage<WeatherCache>(STORAGE_KEYS.WEATHER_CACHE, {});

    // The fetch effect must not re-run when the cache changes (its own writes
    // would retrigger it), so it reads the current cache through a ref.
    const cacheRef = useRef(cache);
    useEffect(() => {
        cacheRef.current = cache;
    }, [cache]);
    const inFlight = useRef(new Set<string>());

    const latitude = location?.latitude;
    const longitude = location?.longitude;

    useEffect(() => {
        if (latitude === undefined || longitude === undefined) return;

        const key = cacheKey(latitude, longitude);
        const cached = usableEntry(cacheRef.current[key]);
        const age = cached ? Date.now() - cached.fetchedAt : Infinity;
        if (age < OPEN_METEO.STALE_MS) return;
        // Too old to stand in for a forecast: drop it now, so a failing fetch
        // leaves no hint rather than a stale one. Newer entries stay usable
        // while the refresh runs.
        if (age > OPEN_METEO.MAX_AGE_MS) {
            setCache(prev => {
                if (!(key in prev)) return prev;
                const { [key]: _expired, ...rest } = prev;
                return rest;
            });
        }
        if (inFlight.current.has(key)) return;

        inFlight.current.add(key);
        const controller = new AbortController();
        fetchForecast(latitude, longitude, controller.signal)
            .then(forecast => {
                setCache(prev => evictOldest({ ...prev, [key]: { fetchedAt: Date.now(), forecast } }));
            })
            .catch(() => {
                // Offline, rate-limited or an unexpected shape: keep whatever
                // is cached (if anything) and leave the hint out otherwise.
            })
            .finally(() => {
                inFlight.current.delete(key);
            });

        return () => controller.abort();
    }, [latitude, longitude, setCache]);

    // Reading the cache stays pure: entries past MAX_AGE_MS are evicted by the
    // effect above rather than filtered out here.
    if (!location) return undefined;
    return cache[cacheKey(location.latitude, location.longitude)]?.forecast;
};
