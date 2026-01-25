/**
 * Centralized constants for the application.
 * Prevents magic strings scattered throughout the codebase.
 */

/**
 * Supported LLM providers with their API configurations and key URLs.
 */
export const LLM_PROVIDERS = {
    gemini: {
        id: 'gemini',
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        model: 'gemini-2.0-flash',
        keyUrl: 'https://aistudio.google.com/app/apikey',
    },
    openai: {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        keyUrl: 'https://platform.openai.com/api-keys',
    },
    mistral: {
        id: 'mistral',
        name: 'Mistral',
        baseUrl: 'https://api.mistral.ai/v1',
        model: 'mistral-small-latest',
        keyUrl: 'https://console.mistral.ai/api-keys',
    },
} as const;

export type LLMProviderId = keyof typeof LLM_PROVIDERS;

/**
 * LocalStorage keys used for persisting user data and preferences.
 */
export const STORAGE_KEYS = {
    LLM_PROVIDER: 'llm_provider',
    API_KEY: 'gemini_api_key', // Legacy key for backwards compatibility
    API_KEY_GEMINI: 'api_key_gemini',
    API_KEY_OPENAI: 'api_key_openai',
    API_KEY_MISTRAL: 'api_key_mistral',
    SPICE_RACK: 'spice_rack_items',
    PEOPLE_COUNT: 'people_count',
    MEALS_COUNT: 'meals_count',
    DIET_PREFERENCE: 'diet_preference',
    STYLE_WISHES: 'style_wishes',
    LANGUAGE: 'language',
    HEADER_MINIMIZED: 'header_minimized',
    OPTIONS_MINIMIZED: 'options_minimized',
    PANTRY_MINIMIZED: 'pantry_minimized',
    SPICE_RACK_MINIMIZED: 'spice_rack_minimized',
    SHOPPING_LIST_MINIMIZED: 'shopping_list_minimized',
    SHOPPING_LIST_CHECKED: 'shopping_list_checked',
    MEAL_PLAN: 'meal_plan',
    WELCOME_DISMISSED: 'welcome_dismissed',
    PANTRY_ITEMS: 'pantry_items',
} as const;

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
    TIMEOUT_MS: 60000,
} as const;

/**
 * Default values for user settings.
 */
export const DEFAULTS = {
    PEOPLE_COUNT: 2,
    MEALS_COUNT: 3,
    DIET: 'flexitarian',
    LANGUAGE: 'English',
    LLM_PROVIDER: 'gemini' as LLMProviderId,
} as const;
