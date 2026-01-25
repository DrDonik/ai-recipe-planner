/**
 * Centralized constants for the application.
 * Prevents magic strings scattered throughout the codebase.
 */

/**
 * LocalStorage keys used for persisting user data and preferences.
 */
export const STORAGE_KEYS = {
    API_KEY: 'gemini_api_key',
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
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
    MODEL: 'gemini-3-flash-preview',
    TIMEOUT_MS: 60000,
} as const;

/**
 * Default values for user settings.
 */
export const DEFAULTS = {
    PEOPLE_COUNT: 2,
    MEALS_COUNT: 3,
    DIET: 'flexitarian',
    LANGUAGE: 'German',
} as const;
