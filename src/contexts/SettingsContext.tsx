import { createContext, useContext, type ReactNode } from 'react';
import { useLocalStorage, useStringLocalStorage } from '../hooks/useLocalStorage';
import { translations } from '../constants/translations';
import { STORAGE_KEYS, DEFAULTS } from '../constants';

type TranslationType = typeof translations.English;
type SupportedLanguage = keyof typeof translations;

const SUPPORTED_LANGUAGES = Object.keys(translations) as SupportedLanguage[];

/**
 * Map browser language codes to app language keys.
 */
const BROWSER_LANGUAGE_MAP: Record<string, SupportedLanguage> = {
    'en': 'English',
    'de': 'German',
    'fr': 'French',
    'es': 'Spanish',
};

/**
 * Detect browser language and map to a supported app language.
 * Falls back to English if browser language is not supported.
 */
const detectBrowserLanguage = (): SupportedLanguage => {
    const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
    return BROWSER_LANGUAGE_MAP[browserLang] ?? DEFAULTS.LANGUAGE;
};

/**
 * Get initial language: use saved preference if exists, otherwise detect from browser.
 */
const getInitialLanguage = (): SupportedLanguage => {
    const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    if (saved && isValidLanguage(saved)) {
        return saved;
    }
    return detectBrowserLanguage();
};

/**
 * Type guard to check if a string is a valid supported language.
 */
const isValidLanguage = (lang: string): lang is SupportedLanguage => {
    return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
};

/**
 * Get translations for a language with fallback to English if invalid.
 */
const getTranslations = (language: string): TranslationType => {
    if (isValidLanguage(language)) {
        return translations[language];
    }
    console.warn(`Invalid language "${language}", falling back to English`);
    return translations.English;
};

interface SettingsContextType {
    useCopyPaste: boolean;
    setUseCopyPaste: (use: boolean) => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    people: number;
    setPeople: (count: number) => void;
    meals: number;
    setMeals: (count: number) => void;
    diet: string;
    setDiet: (diet: string) => void;
    styleWishes: string[];
    setStyleWishes: (wishes: string[]) => void;
    language: string;
    setLanguage: (lang: string) => void;
    t: TranslationType;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/**
 * Determine the initial value for useCopyPaste mode:
 * - Default to true (Copy & Paste mode) for new users
 * - But if user already has an API key stored, default to false (API Key mode)
 */
const getInitialUseCopyPaste = (): boolean => {
    const savedPreference = localStorage.getItem(STORAGE_KEYS.USE_COPY_PASTE);
    if (savedPreference !== null) {
        try {
            return JSON.parse(savedPreference);
        } catch {
            // Corrupted value, fall through to default logic
        }
    }
    // New user: check if they have an existing API key (from before this update)
    const existingApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    return !existingApiKey; // true (Copy & Paste) if no key, false (API Key mode) if key exists
};

/**
 * Migrate old string-based style wishes to array format.
 * Returns an empty array if no data exists, or converts old string to single-item array.
 */
const getInitialStyleWishes = (): string[] => {
    const saved = localStorage.getItem(STORAGE_KEYS.STYLE_WISHES);
    if (!saved) return [];

    try {
        // Try parsing as JSON array first (new format)
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        // If it's a JSON string but not an array, fall through to string handling
    } catch {
        // Not JSON, treat as old string format
    }

    // Old format: plain string or JSON-encoded string
    // If it's a non-empty string, convert to array with single item
    const trimmed = saved.replace(/^"|"$/g, '').trim();
    return trimmed ? [trimmed] : [];
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [useCopyPaste, setUseCopyPaste] = useLocalStorage<boolean>(STORAGE_KEYS.USE_COPY_PASTE, getInitialUseCopyPaste());
    const [apiKey, setApiKey] = useStringLocalStorage(STORAGE_KEYS.API_KEY, '');
    const [people, setPeople] = useLocalStorage<number>(STORAGE_KEYS.PEOPLE_COUNT, DEFAULTS.PEOPLE_COUNT);
    const [meals, setMeals] = useLocalStorage<number>(STORAGE_KEYS.MEALS_COUNT, DEFAULTS.MEALS_COUNT);
    const [diet, setDiet] = useStringLocalStorage(STORAGE_KEYS.DIET_PREFERENCE, DEFAULTS.DIET);
    const [styleWishes, setStyleWishes] = useLocalStorage<string[]>(STORAGE_KEYS.STYLE_WISHES, getInitialStyleWishes());
    const [language, setLanguage] = useStringLocalStorage(STORAGE_KEYS.LANGUAGE, getInitialLanguage());

    const t = getTranslations(language);

    const value = {
        useCopyPaste, setUseCopyPaste,
        apiKey, setApiKey,
        people, setPeople,
        meals, setMeals,
        diet, setDiet,
        styleWishes, setStyleWishes,
        language, setLanguage,
        t
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
