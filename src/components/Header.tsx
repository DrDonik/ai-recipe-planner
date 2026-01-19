import React from 'react';
import { Utensils, Key, Info, Globe, ChevronUp, ChevronDown } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface HeaderProps {
    headerMinimized: boolean;
    setHeaderMinimized: (minimized: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
    headerMinimized,
    setHeaderMinimized,
}) => {
    const { apiKey, setApiKey, language, setLanguage, t } = useSettings();

    return (
        <header className={`glass-panel !py-2 rounded-none border-x-0 border-t-0 sticky top-0 z-50 mb-4 backdrop-blur-xl transition-all duration-300 ${headerMinimized ? '!py-1' : ''}`}>
            <div className="app-container flex flex-col items-center py-1">
                <div className="flex flex-col items-start gap-3 relative w-max ml-12 sm:ml-0">
                    {/* Floating Leading Icon */}
                    <div className={`absolute -left-14 sm:-left-16 top-0.5 p-2 bg-primary rounded-xl text-white shadow-lg shadow-primary/30 transition-all duration-300 ${headerMinimized ? 'scale-75' : ''}`}>
                        <Utensils className={`transition-all duration-300 ${headerMinimized ? 'w-5 h-5' : 'w-6 h-6 sm:w-7 sm:h-7'}`} />
                    </div>

                    {/* Title with inline toggle button */}
                    <div className="flex items-center gap-3">
                        <h1 className={`font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary transition-all duration-300 ${headerMinimized ? 'text-2xl' : 'text-4xl'}`}>
                            AI Recipe Planner
                        </h1>

                        {/* Toggle Button */}
                        <button
                            onClick={() => setHeaderMinimized(!headerMinimized)}
                            className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors text-text-muted hover:text-primary"
                            aria-label={headerMinimized ? 'Expand' : 'Collapse'}
                        >
                            {headerMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </button>
                    </div>

                    {!headerMinimized && (
                        <>
                            <p className="text-sm text-text-muted animate-in fade-in slide-in-from-top-2 duration-300">{t.tagline}</p>

                            <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 p-1.5 rounded-full border border-[var(--glass-border)] animate-in fade-in slide-in-from-top-2 duration-300">
                                <label htmlFor="api-key-input" className="sr-only">{t.apiKeyLabel}</label>
                                <Key size={16} className="ml-2 text-text-muted" aria-hidden="true" />
                                <input
                                    id="api-key-input"
                                    type="password"
                                    placeholder={t.apiKeyPlaceholder}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm w-48 px-2"
                                />
                                <div className="tooltip-container flex items-center mr-2">
                                    <button
                                        type="button"
                                        className="text-text-muted hover:text-primary transition-colors p-1 rounded-full outline-none focus:text-primary"
                                        aria-label={t.apiInfo}
                                    >
                                        <Info size={14} />
                                    </button>
                                    <div className="tooltip-text">
                                        {t.apiInfo}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 p-1.5 rounded-full border border-[var(--glass-border)] animate-in fade-in slide-in-from-top-2 duration-300">
                                <label htmlFor="language-select" className="sr-only">{t.languageLabel}</label>
                                <Globe size={16} className="ml-2 text-text-muted" aria-hidden="true" />
                                <select
                                    id="language-select"
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm px-2 cursor-pointer font-medium text-text-main w-full"
                                    aria-label={t.languageLabel}
                                >
                                    <option value="German">Deutsch</option>
                                    <option value="English">English</option>
                                    <option value="Spanish">Español</option>
                                    <option value="French">Français</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};
