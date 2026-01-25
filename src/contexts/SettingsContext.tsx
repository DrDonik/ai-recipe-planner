import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useLocalStorage, useStringLocalStorage } from '../hooks/useLocalStorage';
import { translations } from '../constants/translations';
import { STORAGE_KEYS, DEFAULTS, LLM_PROVIDERS, type LLMProviderId } from '../constants';

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
    provider: LLMProviderId;
    setProvider: (provider: LLMProviderId) => void;
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

/**
 * Validate and return a valid provider ID.
 */
const isValidProvider = (provider: string): provider is LLMProviderId => {
    return provider in LLM_PROVIDERS;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [provider, setProviderRaw] = useStringLocalStorage(STORAGE_KEYS.LLM_PROVIDER, DEFAULTS.LLM_PROVIDER);
    const [apiKeyGemini, setApiKeyGemini] = useStringLocalStorage(STORAGE_KEYS.API_KEY_GEMINI, '');
    const [apiKeyOpenai, setApiKeyOpenai] = useStringLocalStorage(STORAGE_KEYS.API_KEY_OPENAI, '');
    const [apiKeyMistral, setApiKeyMistral] = useStringLocalStorage(STORAGE_KEYS.API_KEY_MISTRAL, '');
    const [people, setPeople] = useLocalStorage<number>(STORAGE_KEYS.PEOPLE_COUNT, DEFAULTS.PEOPLE_COUNT);
    const [meals, setMeals] = useLocalStorage<number>(STORAGE_KEYS.MEALS_COUNT, DEFAULTS.MEALS_COUNT);
    const [diet, setDiet] = useStringLocalStorage(STORAGE_KEYS.DIET_PREFERENCE, DEFAULTS.DIET);
    const [styleWishes, setStyleWishes] = useStringLocalStorage(STORAGE_KEYS.STYLE_WISHES, '');
    const [language, setLanguage] = useStringLocalStorage(STORAGE_KEYS.LANGUAGE, getInitialLanguage());

    // Migrate legacy API key to new Gemini key storage
    useEffect(() => {
        const legacyKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
        if (legacyKey && !apiKeyGemini) {
            setApiKeyGemini(legacyKey);
            localStorage.removeItem(STORAGE_KEYS.API_KEY);
        }
    }, [apiKeyGemini, setApiKeyGemini]);

    // Validate provider and cast to correct type
    const validProvider: LLMProviderId = isValidProvider(provider) ? provider : DEFAULTS.LLM_PROVIDER;

    const setProvider = (newProvider: LLMProviderId) => {
        if (isValidProvider(newProvider)) {
            setProviderRaw(newProvider);
        }
    };

    // Get API key for current provider
    const apiKeyMap: Record<LLMProviderId, string> = {
        gemini: apiKeyGemini,
        openai: apiKeyOpenai,
        mistral: apiKeyMistral,
    };
    const apiKey = apiKeyMap[validProvider];

    // Set API key for current provider
    const setApiKey = (key: string) => {
        const setterMap: Record<LLMProviderId, (key: string) => void> = {
            gemini: setApiKeyGemini,
            openai: setApiKeyOpenai,
            mistral: setApiKeyMistral,
        };
        setterMap[validProvider](key);
    };

    const t = getTranslations(language);

    const value = {
        provider: validProvider, setProvider,
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
