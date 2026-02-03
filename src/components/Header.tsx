import React, { useState } from 'react';
import { Utensils, Key, Globe, ChevronUp, ChevronDown, CircleHelp, ExternalLink } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { API_CONFIG, STORAGE_KEYS } from '../constants';
import { ApiKeySecurityDialog } from './ApiKeySecurityDialog';
import { ClearApiKeyDialog } from './ClearApiKeyDialog';
import type { Notification } from '../types';

interface HeaderProps {
    headerMinimized: boolean;
    setHeaderMinimized: (minimized: boolean) => void;
    onShowHelp: () => void;
    onShowNotification: (notification: Notification) => void;
    onClearNotification: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    headerMinimized,
    setHeaderMinimized,
    onShowHelp,
    onShowNotification,
    onClearNotification,
}) => {
    const { useCopyPaste, setUseCopyPaste, apiKey, setApiKey, language, setLanguage, t } = useSettings();

    // Check on mount if existing user needs to see the security warning
    const [showSecurityDialog, setShowSecurityDialog] = useState(() => {
        const hasSeenWarning = localStorage.getItem(STORAGE_KEYS.API_KEY_WARNING_SEEN) === 'true';
        if (hasSeenWarning) return false;

        const storedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
        if (!storedApiKey) return false;

        const storedUseCopyPaste = localStorage.getItem(STORAGE_KEYS.USE_COPY_PASTE);
        let inApiKeyMode = true; // Default: having API key implies API Key mode
        if (storedUseCopyPaste) {
            try {
                inApiKeyMode = !JSON.parse(storedUseCopyPaste);
            } catch {
                // Corrupted value, assume API Key mode
            }
        }

        return inApiKeyMode;
    });
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [pendingModeSwitch, setPendingModeSwitch] = useState<'toApiKey' | 'toCopyPaste' | null>(null);

    const clearApiKeyWithUndo = () => {
        const backupKey = apiKey;
        setApiKey('');
        setUseCopyPaste(true);
        onShowNotification({
            message: t.undo.apiKeyCleared,
            type: 'undo',
            action: {
                label: t.undo.action,
                onClick: () => {
                    setApiKey(backupKey);
                    setUseCopyPaste(false);
                    onClearNotification();
                }
            },
            timeout: 5000
        });
    };

    const handleModeToggle = () => {
        if (useCopyPaste) {
            // Switching TO API Key mode - always show warning
            setPendingModeSwitch('toApiKey');
            setShowSecurityDialog(true);
        } else {
            // Switching TO Copy & Paste mode
            if (apiKey) {
                // Ask if user wants to clear or keep the API key
                setPendingModeSwitch('toCopyPaste');
                setShowClearDialog(true);
            } else {
                setUseCopyPaste(true);
            }
        }
    };

    const handleSecurityAccept = () => {
        localStorage.setItem(STORAGE_KEYS.API_KEY_WARNING_SEEN, 'true');
        setShowSecurityDialog(false);
        if (pendingModeSwitch === 'toApiKey') {
            setUseCopyPaste(false);
        }
        setPendingModeSwitch(null);
    };

    const handleSecurityUseCopyPaste = () => {
        localStorage.setItem(STORAGE_KEYS.API_KEY_WARNING_SEEN, 'true');
        setShowSecurityDialog(false);

        // Ask if user wants to clear or keep the API key
        if (apiKey) {
            setPendingModeSwitch('toCopyPaste');
            setShowClearDialog(true);
        } else {
            setUseCopyPaste(true);
            setPendingModeSwitch(null);
        }
    };

    const handleClearApiKey = () => {
        setShowClearDialog(false);
        setPendingModeSwitch(null);
        clearApiKeyWithUndo();
    };

    const handleKeepApiKey = () => {
        setShowClearDialog(false);
        setUseCopyPaste(true);
        setPendingModeSwitch(null);
    };

    return (
        <>
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
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <p className="text-sm text-text-muted">Turn your pantry into plans</p>
                                <button
                                    onClick={onShowHelp}
                                    className="p-1 hover:bg-white/50 dark:hover:bg-black/30 rounded-full transition-colors text-text-muted hover:text-primary"
                                    aria-label={t.welcome.title}
                                >
                                    <CircleHelp size={16} />
                                </button>
                            </div>

                            {/* Mode Toggle Switch */}
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <span className={`text-sm transition-colors ${useCopyPaste ? 'text-text-main font-medium' : 'text-text-muted'}`}>
                                    {t.modeSwitch.copyPaste}
                                </span>
                                <button
                                    onClick={handleModeToggle}
                                    className="relative w-12 h-6 bg-white/50 dark:bg-black/30 rounded-full border border-[var(--glass-border)] transition-colors hover:bg-white/70 dark:hover:bg-black/40"
                                    role="switch"
                                    aria-checked={!useCopyPaste}
                                    aria-label={useCopyPaste ? t.modeSwitch.copyPaste : t.modeSwitch.apiKey}
                                >
                                    <span
                                        className={`absolute top-0.5 w-5 h-5 bg-primary rounded-full shadow-md transition-all duration-200 ${useCopyPaste ? 'left-0.5' : 'left-6'}`}
                                    />
                                </button>
                                <span className={`text-sm transition-colors ${!useCopyPaste ? 'text-text-main font-medium' : 'text-text-muted'}`}>
                                    {t.modeSwitch.apiKey}
                                </span>
                            </div>

                            {!useCopyPaste && (
                                <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 p-1.5 rounded-full border border-[var(--glass-border)] animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label htmlFor="api-key-input" className="sr-only">{t.apiKeyLabel}</label>
                                    <Key size={16} className="ml-2 text-text-muted" aria-hidden="true" />
                                    <input
                                        id="api-key-input"
                                        type="password"
                                        placeholder={t.apiKeyPlaceholder}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="bg-transparent border-none outline-none text-sm w-40 px-2"
                                    />
                                    <a
                                        href={API_CONFIG.KEY_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-text-muted hover:text-primary transition-colors p-1 rounded-full"
                                        title={t.getApiKey}
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            )}

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

        {showSecurityDialog && (
            <ApiKeySecurityDialog
                onAccept={handleSecurityAccept}
                onUseCopyPaste={handleSecurityUseCopyPaste}
            />
        )}

        {showClearDialog && (
            <ClearApiKeyDialog
                onClear={handleClearApiKey}
                onKeep={handleKeepApiKey}
            />
        )}
        </>
    );
};
