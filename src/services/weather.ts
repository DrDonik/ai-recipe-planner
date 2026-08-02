import { z } from 'zod';
import { OPEN_METEO } from '../constants';

/**
 * Weather service backed by Open-Meteo (no API key, CORS enabled).
 *
 * Everything the LLM eventually sees is produced here from numbers and a
 * closed set of condition literals — no text from the API response is ever
 * forwarded to the prompt (see `buildRecipePrompt`). Place names returned by
 * the geocoder are shown in the UI only.
 */

/** Coarse weather vocabulary the WMO codes are mapped onto. */
export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog';

/**
 * Summary of the next few days, as handed to the prompt builder.
 *
 * Both temperatures are daytime highs: what a meal is planned around is how
 * warm the day gets, not how cold the night was. Mixing in the nightly minima
 * produced ranges like "19 to 37 °C" that say very little.
 */
export interface Forecast {
    /** Coolest daily high in the window, °C, whole numbers. */
    minHighC: number;
    /** Warmest daily high in the window, °C, whole numbers. */
    maxHighC: number;
    condition: WeatherCondition;
    /** Daily highs spread by more than 8 °C — the window has no single character. */
    changeable: boolean;
}

/** A geocoding hit offered to the user while typing a town name. */
export interface LocationSuggestion {
    /** Pre-composed label, e.g. "Basel, Basel-City, CH". */
    label: string;
    name: string;
    latitude: number;
    longitude: number;
}

const GeocodingResponseSchema = z.object({
    results: z.array(z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        admin1: z.string().optional(),
        country_code: z.string().optional(),
    })).optional(),
});

const ForecastResponseSchema = z.object({
    daily: z.object({
        temperature_2m_max: z.array(z.number()),
        weather_code: z.array(z.number()),
    }),
});

/** Longest place name kept — keeps a hostile geocoder out of localStorage. */
const MAX_NAME_LENGTH = 80;

/** Spread of daily highs above which the window is called "changeable". */
const CHANGEABLE_SPREAD_C = 8;

/**
 * Maps a WMO weather code (https://open-meteo.com/en/docs) onto our vocabulary.
 * Unknown codes fall back to 'cloudy', the least suggestive option.
 */
const toCondition = (code: number): WeatherCondition => {
    if (code <= 1) return 'clear';
    if (code <= 3) return 'cloudy';
    if (code <= 48) return 'fog';
    if (code <= 67) return 'rain';
    if (code <= 77) return 'snow';
    if (code <= 82) return 'rain';
    if (code <= 86) return 'snow';
    if (code <= 99) return 'storm';
    return 'cloudy';
};

/**
 * Most frequent condition over the window. Ties go to the more consequential
 * one for cooking: a day of thunderstorms says more about the plan than a day
 * of sunshine.
 */
const SEVERITY: readonly WeatherCondition[] = ['clear', 'cloudy', 'fog', 'rain', 'snow', 'storm'];

const dominantCondition = (codes: number[]): WeatherCondition => {
    const counts = new Map<WeatherCondition, number>();
    for (const code of codes) {
        const condition = toCondition(code);
        counts.set(condition, (counts.get(condition) ?? 0) + 1);
    }
    let best: WeatherCondition = 'cloudy';
    let bestCount = 0;
    for (const [condition, count] of counts) {
        if (count > bestCount || (count === bestCount && SEVERITY.indexOf(condition) > SEVERITY.indexOf(best))) {
            best = condition;
            bestCount = count;
        }
    }
    return best;
};

const fetchJson = async (url: string, signal?: AbortSignal): Promise<unknown> => {
    const timeoutSignal = AbortSignal.timeout(OPEN_METEO.TIMEOUT_MS);
    const response = await fetch(url, {
        signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    });
    if (!response.ok) throw new Error(`Open-Meteo responded with ${response.status}`);
    return response.json();
};

/** App language name → the ISO code Open-Meteo's geocoder expects. */
const GEOCODING_LANGUAGE: Record<string, string> = {
    English: 'en',
    German: 'de',
    French: 'fr',
    Spanish: 'es',
};

/**
 * Looks up towns matching `query`. Returns an empty list on any failure —
 * the location field degrades to "no match found" rather than an error state.
 */
export const searchLocations = async (
    query: string,
    language: string,
    signal?: AbortSignal,
): Promise<LocationSuggestion[]> => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const languageCode = GEOCODING_LANGUAGE[language] ?? 'en';
    const url = `${OPEN_METEO.GEOCODING_URL}?name=${encodeURIComponent(trimmed)}&count=5&language=${languageCode}&format=json`;

    let payload: unknown;
    try {
        payload = await fetchJson(url, signal);
    } catch {
        // Offline, rate-limited or aborted: an empty list is what the caller
        // renders as "no matching place found".
        return [];
    }
    const parsed = GeocodingResponseSchema.safeParse(payload);
    if (!parsed.success) return [];

    return (parsed.data.results ?? []).map((result) => {
        const name = result.name.slice(0, MAX_NAME_LENGTH);
        const label = [name, result.admin1?.slice(0, MAX_NAME_LENGTH), result.country_code]
            .filter(Boolean)
            .join(', ');
        return { label, name, latitude: result.latitude, longitude: result.longitude };
    });
};

/**
 * Fetches and summarizes the forecast for the configured window.
 * Throws on network or shape failures; callers treat that as "no hint".
 */
export const fetchForecast = async (
    latitude: number,
    longitude: number,
    signal?: AbortSignal,
): Promise<Forecast> => {
    const url = `${OPEN_METEO.FORECAST_URL}?latitude=${latitude}&longitude=${longitude}`
        + `&daily=temperature_2m_max,weather_code`
        + `&forecast_days=${OPEN_METEO.FORECAST_DAYS}&timezone=auto`;
    const parsed = ForecastResponseSchema.safeParse(await fetchJson(url, signal));
    if (!parsed.success) throw new Error('Unexpected Open-Meteo forecast shape');

    const { temperature_2m_max: highs, weather_code: codes } = parsed.data.daily;
    if (highs.length === 0 || codes.length === 0) {
        throw new Error('Empty Open-Meteo forecast');
    }

    return {
        minHighC: Math.round(Math.min(...highs)),
        maxHighC: Math.round(Math.max(...highs)),
        condition: dominantCondition(codes),
        changeable: Math.max(...highs) - Math.min(...highs) > CHANGEABLE_SPREAD_C,
    };
};
