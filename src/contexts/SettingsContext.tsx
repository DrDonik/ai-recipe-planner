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
    apiKey: string;
    setApiKey: (key: string) => void;
    people: number;
    setPeople: (count: number) => void;
    meals: number;
    setMeals: (count: number) => void;
    diet: string;
    setDiet: (diet: string) => void;
    styleWishes: string;
    setStyleWishes: (wishes: string) => void;
    language: string;
    setLanguage: (lang: string) => void;
    t: TranslationType;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [apiKey, setApiKey] = useStringLocalStorage(STORAGE_KEYS.API_KEY, '');
    const [people, setPeople] = useLocalStorage<number>(STORAGE_KEYS.PEOPLE_COUNT, DEFAULTS.PEOPLE_COUNT);
    const [meals, setMeals] = useLocalStorage<number>(STORAGE_KEYS.MEALS_COUNT, DEFAULTS.MEALS_COUNT);
    const [diet, setDiet] = useStringLocalStorage(STORAGE_KEYS.DIET_PREFERENCE, DEFAULTS.DIET);
    const [styleWishes, setStyleWishes] = useStringLocalStorage(STORAGE_KEYS.STYLE_WISHES, '');
    const [language, setLanguage] = useStringLocalStorage(STORAGE_KEYS.LANGUAGE, getInitialLanguage());

    const t = getTranslations(language);

    const value = {
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
