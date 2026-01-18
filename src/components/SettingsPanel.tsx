import React from 'react';
import { Utensils, ChefHat, Users, Salad, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface SettingsPanelProps {
    optionsMinimized: boolean;
    setOptionsMinimized: (minimized: boolean) => void;
    loading: boolean;
    handleGenerate: () => void;
    error: string | null;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    optionsMinimized,
    setOptionsMinimized,
    loading,
    handleGenerate,
    error
}) => {
    const { diet, setDiet, styleWishes, setStyleWishes, people, setPeople, meals, setMeals, t } = useSettings();

    return (
        <>
            {/* Preferences Panel */}
            <div className="glass-panel p-6 space-y-2">
                {/* Diet Preference */}
                <div className="flex flex-col items-start gap-3">
                    <div className="flex items-center gap-3 justify-between w-full">
                        <div className="flex items-center gap-3">
                            <Utensils className="text-secondary" size={24} />
                            <span>{t.diet}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="tooltip-container">
                                <button
                                    onClick={() => setOptionsMinimized(!optionsMinimized)}
                                    className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors text-text-muted hover:text-primary"
                                    aria-label={optionsMinimized ? t.optionsExpand : t.optionsMinimize}
                                >
                                    {optionsMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                </button>
                                <div className="tooltip-text">
                                    {optionsMinimized ? t.optionsExpand : t.optionsMinimize}
                                </div>
                            </div>
                        </div>
                    </div>
                    {!optionsMinimized && (
                        <select
                            value={diet}
                            onChange={(e) => setDiet(e.target.value)}
                            className="bg-white/50 dark:bg-black/20 border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:border-primary transition-all cursor-pointer"
                        >
                            <option value="Vegan">{t.dietOptions.vegan}</option>
                            <option value="Vegetarian">{t.dietOptions.vegetarian}</option>
                            <option value="Mostly Vegetarian">{t.dietOptions.mostlyVegetarian}</option>
                            <option value="Pescatarian">{t.dietOptions.pescatarian}</option>
                            <option value="Flexitarian">{t.dietOptions.flexitarian}</option>
                            <option value="Carnivore">{t.dietOptions.carnivore}</option>
                        </select>
                    )}
                </div>

                {!optionsMinimized && (
                    <>
                        {/* Separator */}
                        <div className="h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />

                        {/* Style, Wishes, etc. */}
                        <div className="flex flex-col items-start gap-3">
                            <div className="flex items-center gap-3">
                                <ChefHat className="text-secondary" size={24} />
                                <span>{t.styleWishes}</span>
                            </div>
                            <input
                                type="text"
                                value={styleWishes}
                                onChange={(e) => setStyleWishes(e.target.value)}
                                placeholder={t.styleWishesPlaceholder}
                                className="bg-white/50 dark:bg-black/20 border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary transition-all w-full"
                            />
                        </div>

                        {/* Separator */}
                        <div className="h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />

                        {/* People Count */}
                        <div className="flex flex-col items-start gap-3">
                            <div className="flex items-center gap-3">
                                <Users className="text-secondary" size={24} />
                                <span>{t.people}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 rounded-lg p-1 w-max">
                                <button
                                    onClick={() => setPeople(Math.max(1, people - 1))}
                                    className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-gray-50 shadow-sm text-lg font-bold transition-colors text-gray-900"
                                >-</button>
                                <span className="w-8 text-center font-mono font-semibold text-sm">{people}</span>
                                <button
                                    onClick={() => setPeople(people + 1)}
                                    className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-gray-50 shadow-sm text-lg font-bold transition-colors text-gray-900"
                                >+</button>
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />

                        {/* Meals Count */}
                        <div className="flex flex-col items-start gap-3">
                            <div className="flex items-center gap-3">
                                <Salad className="text-secondary" size={24} />
                                <span>{t.meals}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 rounded-lg p-1 w-max">
                                <button
                                    onClick={() => setMeals(Math.max(1, meals - 1))}
                                    className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-gray-50 shadow-sm text-lg font-bold transition-colors text-gray-900"
                                >-</button>
                                <span className="w-8 text-center font-mono font-semibold text-sm">{meals}</span>
                                <button
                                    onClick={() => setMeals(meals + 1)}
                                    className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-gray-50 shadow-sm text-lg font-bold transition-colors text-gray-900"
                                >+</button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <button
                onClick={handleGenerate}
                disabled={loading}
                className={`btn btn-primary w-full py-4 text-lg rounded-xl shadow-lg shadow-primary/20 ${loading ? 'opacity-80 cursor-wait' : ''}`}
            >
                {loading ? (
                    <>
                        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                        {t.planning}
                    </>
                ) : (
                    <>
                        <Sparkles size={20} /> {t.generate}
                    </>
                )}
            </button>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm animate-in fade-in slide-in-from-top-2">
                    {error}
                </div>
            )}
        </>
    );
};
