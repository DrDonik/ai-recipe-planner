/**
 * Centralized constants for the application.
 * Prevents magic strings scattered throughout the codebase.
 */

/**
 * LocalStorage keys used for persisting user data and preferences.
 */
export const STORAGE_KEYS = {
    API_KEY: 'gemini_api_key',
    USE_COPY_PASTE: 'use_copy_paste',
    API_KEY_WARNING_SEEN: 'api_key_warning_seen',
    SPICE_RACK: 'spice_rack_items',
    PEOPLE_COUNT: 'people_count',
    MEALS_COUNT: 'meals_count',
    DIET_PREFERENCE: 'diet_preference',
    STYLE_WISHES: 'style_wishes',
    PLANNED_RECIPES: 'planned_recipes',
    LANGUAGE: 'language',
    HEADER_MINIMIZED: 'header_minimized',
    OPTIONS_MINIMIZED: 'options_minimized',
    PANTRY_MINIMIZED: 'pantry_minimized',
    SPICE_RACK_MINIMIZED: 'spice_rack_minimized',
    KITCHEN_APPLIANCES: 'kitchen_appliances_items',
    KITCHEN_APPLIANCES_MINIMIZED: 'kitchen_appliances_minimized',
    KITCHENS: 'kitchens',
    ACTIVE_KITCHEN_ID: 'active_kitchen_id',
    SHOPPING_LIST_MINIMIZED: 'shopping_list_minimized',
    RECIPE_MISSING_INGREDIENTS_MINIMIZED: 'recipe_missing_ingredients_minimized',
    SHOPPING_LIST_CHECKED: 'shopping_list_checked',
    SHOPPING_LIST_CHECKED_SHARED: 'shopping_list_checked_shared',
    MEAL_PLAN: 'meal_plan',
    WELCOME_DISMISSED: 'welcome_dismissed',
    PANTRY_ITEMS: 'pantry_items',
    GIST_TOKEN: 'gist_sync_token',
    GIST_ID: 'gist_sync_id',
    SYNC_UPDATED_AT: 'sync_updated_at',
    GIST_TOKEN_WARNING_SEEN: 'gist_token_warning_seen',
    STORAGE_TIPS_CACHE: 'storage_tips_cache',
    PHOTO_PRIVACY_ACK: 'photo_privacy_ack',
    IMAGE_GEN_ENABLED: 'image_gen_enabled',
    WEATHER_CACHE: 'weather_cache',
} as const;

/**
 * LocalStorage keys that participate in Gist-based multi-device sync.
 * Device-local state (panel collapse, API key, welcome dismissed, language UI)
 * is intentionally excluded.
 */
export const SYNCED_STORAGE_KEYS: readonly string[] = [
    STORAGE_KEYS.PANTRY_ITEMS,
    STORAGE_KEYS.SPICE_RACK,
    STORAGE_KEYS.KITCHEN_APPLIANCES,
    STORAGE_KEYS.KITCHENS,
    STORAGE_KEYS.ACTIVE_KITCHEN_ID,
    STORAGE_KEYS.PEOPLE_COUNT,
    STORAGE_KEYS.MEALS_COUNT,
    STORAGE_KEYS.DIET_PREFERENCE,
    STORAGE_KEYS.STYLE_WISHES,
    STORAGE_KEYS.PLANNED_RECIPES,
    STORAGE_KEYS.MEAL_PLAN,
    STORAGE_KEYS.SHOPPING_LIST_CHECKED,
    STORAGE_KEYS.STORAGE_TIPS_CACHE,
] as const;

/**
 * URL query parameter names for sharing functionality.
 */
export const URL_PARAMS = {
    RECIPE: 'recipe',
    SHOPPING_LIST: 'shoppingList',
} as const;

/**
 * API configuration for the LLM service.
 */
export const API_CONFIG = {
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
    MODEL: 'gemini-3.6-flash',
    IMAGE_MODEL: 'gemini-3.1-flash-image',
    TIMEOUT_MS: 60000,
    KEY_URL: 'https://aistudio.google.com/app/apikey',
} as const;

/**
 * Open-Meteo configuration. No API key required; the free tier is CC BY 4.0
 * for non-commercial use, which is why the location editor credits it.
 */
export const OPEN_METEO = {
    GEOCODING_URL: 'https://geocoding-api.open-meteo.com/v1/search',
    FORECAST_URL: 'https://api.open-meteo.com/v1/forecast',
    ATTRIBUTION_URL: 'https://open-meteo.com/',
    /** Days summarized into the weather hint. */
    FORECAST_DAYS: 4,
    TIMEOUT_MS: 8000,
    /** Cached forecasts older than this are refreshed in the background. */
    STALE_MS: 3 * 60 * 60 * 1000,
    /** Beyond this a cached forecast is dropped rather than used. */
    MAX_AGE_MS: 24 * 60 * 60 * 1000,
    /** Cache entries kept (one per location); oldest are evicted first. */
    MAX_CACHE_ENTRIES: 8,
} as const;

/**
 * GitHub Gist API configuration for multi-device sync.
 */
export const GIST_API = {
    BASE_URL: 'https://api.github.com/gists',
    FILENAME: 'ai-recipe-planner.json',
    TIMEOUT_MS: 15000,
    PUSH_DEBOUNCE_MS: 3000,
    TOKEN_URL: 'https://github.com/settings/tokens',
} as const;

/**
 * Default values for user settings.
 */
export const DEFAULTS = {
    PEOPLE_COUNT: 2,
    MEALS_COUNT: 3,
    DIET: 'Flexitarian',
    LANGUAGE: 'English',
} as const;

/**
 * Input validation constraints.
 */
export const VALIDATION = {
    MAX_INPUT_LENGTH: 200,
} as const;
