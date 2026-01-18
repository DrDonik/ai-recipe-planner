import React, { createContext, useContext, type ReactNode } from 'react';
import { useLocalStorage, useStringLocalStorage } from '../hooks/useLocalStorage';
import { translations } from '../constants/translations';

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
    t: any;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [apiKey, setApiKey] = useStringLocalStorage('gemini_api_key', '');
    const [people, setPeople] = useLocalStorage<number>('people_count', 2);
    const [meals, setMeals] = useLocalStorage<number>('meals_count', 4);
    const [diet, setDiet] = useStringLocalStorage('diet_preference', 'Mostly Vegetarian');
    const [styleWishes, setStyleWishes] = useStringLocalStorage('style_wishes', '');
    const [language, setLanguage] = useStringLocalStorage('language', 'German');

    const t = translations[language as keyof typeof translations];

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

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
