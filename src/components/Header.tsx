import React, { useState, useRef } from 'react';
import { Utensils, Key, Globe, ChevronUp, ChevronDown, CircleHelp, AlertTriangle, Download, Upload, Cloud, CloudOff, Loader2, ImageIcon, Info } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { STORAGE_KEYS } from '../constants';
import { ApiKeyDialog, type ApiKeyDialogStep } from './ApiKeyDialog';
import { ClearApiKeyDialog } from './ClearApiKeyDialog';
import { GistSyncDialog } from './GistSyncDialog';
import { TooltipButton } from './ui/TooltipButton';
import { Toggle } from './ui/Toggle';
import { UndoToast } from './ui/UndoToast';
import { buildExportData, downloadExportFile, readImportFile, applyImportData } from '../utils/dataTransfer';
import type { Notification } from '../types';
import type { SyncStatus } from '../hooks/useGistSync';

const hasSeenApiKeyWarning = () =>
    localStorage.getItem(STORAGE_KEYS.API_KEY_WARNING_SEEN) === 'true';

interface HeaderProps {
    headerMinimized: boolean;
    setHeaderMinimized: (minimized: boolean) => void;
    onShowHelp: () => void;
    onShowNotification: (notification: Notification) => void;
    onClearNotification: () => void;
    syncStatus: SyncStatus;
    notification: Notification | null;
}

export const Header: React.FC<HeaderProps> = ({
    headerMinimized,
    setHeaderMinimized,
    onShowHelp,
    onShowNotification,
    onClearNotification,
    syncStatus,
    notification,
}) => {
    const { useCopyPaste, setUseCopyPaste, apiKey, setApiKey, language, setLanguage, imageGenEnabled, setImageGenEnabled, t } = useSettings();

    // Check on mount if existing user needs to see the security warning
    const [apiDialogStep, setApiDialogStep] = useState<ApiKeyDialogStep | null>(
        () => (!hasSeenApiKeyWarning() && !!apiKey && !useCopyPaste ? 'warning' : null)
    );
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [showSyncDialog, setShowSyncDialog] = useState(false);
    const importFileRef = useRef<HTMLInputElement>(null);

    const syncIcon = (() => {
        switch (syncStatus) {
            case 'pulling':
            case 'pushing':
                return <Loader2 size={16} className="text-primary animate-spin" />;
            case 'pending':
                return <Cloud size={16} className="text-warning-text" />;
            case 'synced':
                return <Cloud size={16} className="text-primary" />;
            case 'error':
                return <Cloud size={16} className="text-red-500" />;
            case 'idle':
            default:
                return <CloudOff size={16} className="text-text-muted" />;
        }
    })();

    const syncTooltip = (() => {
        switch (syncStatus) {
            case 'pulling':
                return t.sync.pullingTooltip;
            case 'pushing':
                return t.sync.pushingTooltip;
            case 'pending':
                return t.sync.pendingTooltip;
            case 'synced':
                return t.sync.enabledTooltip;
            case 'error':
                return t.sync.errorTooltip;
            case 'idle':
            default:
                return t.sync.disabledTooltip;
        }
    })();

    const handleExport = () => {
        const data = buildExportData();
        downloadExportFile(data);
        onShowNotification({ message: t.dataTransfer.exportSuccess, type: 'undo', timeout: 3000 });
    };

    const handleImportClick = () => {
        importFileRef.current?.click();
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset the input so the same file can be selected again
        e.target.value = '';

        if (!window.confirm(t.dataTransfer.importConfirm)) return;

        try {
            const data = await readImportFile(file);
            applyImportData(data);
            onShowNotification({ message: t.dataTransfer.importSuccess, type: 'undo', timeout: 2000 });
            // Reload to pick up all the new localStorage values
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            const key = (err instanceof Error ? err.message : '') as keyof typeof t.dataTransfer;
            const message = t.dataTransfer[key] || t.dataTransfer.invalidImportStructure;
            onShowNotification({ message, type: 'error' });
        }
    };

    const clearApiKeyWithUndo = () => {
        const backupKey = apiKey;
        setApiKey('');
        setUseCopyPaste(true);
        onShowNotification({
            message: t.undo.apiKeyCleared,
            type: 'undo',
            anchor: 'api-key',
            action: {
                label: t.undo.action,
                ariaLabel: `${t.undo.action} ${t.undo.apiKeyCleared.toLowerCase()}`,
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
        if (!useCopyPaste) {
            // Switching TO Copy & Paste mode
            if (apiKey) {
                // Ask if user wants to clear or keep the API key
                setShowClearDialog(true);
            } else {
                setUseCopyPaste(true);
            }
            return;
        }

        // Switching TO API Key mode. A stored key is all the mode needs, and
        // the warning is about a key being stored — so with one already in
        // local storage the switch exposes nothing new and asks nothing. The
        // header's persistent apiKeyStoredWarning tooltip carries the reminder
        // from there.
        if (apiKey) {
            setUseCopyPaste(false);
            return;
        }
        setApiDialogStep(hasSeenApiKeyWarning() ? 'key' : 'warning');
    };

    const markApiKeyWarningSeen = () => {
        try {
            localStorage.setItem(STORAGE_KEYS.API_KEY_WARNING_SEEN, 'true');
        } catch (error) {
            console.error(`Error saving localStorage key "${STORAGE_KEYS.API_KEY_WARNING_SEEN}":`, error);
        }
    };

    const handleSecurityAccept = () => {
        markApiKeyWarningSeen();
        setApiDialogStep('key');
    };

    const handleApiKeySave = (key: string) => {
        setApiKey(key);
        setUseCopyPaste(false);
        setApiDialogStep(null);
    };

    const handleApiDialogCancel = () => {
        // Deliberately no markApiKeyWarningSeen(): declining the warning is not
        // acknowledging it, so a later switch to API Key mode must ask again —
        // same as the Gist and photo dialogs, which only record consent on accept.
        const declinedWarning = apiDialogStep === 'warning';
        setApiDialogStep(null);

        // Declining the warning while a key is already stored is the on-mount
        // case for existing users: drop back to Copy & Paste and ask whether
        // the key should be cleared. Every other cancel — an aborted switch, a
        // closed key dialog — leaves the current mode untouched.
        if (declinedWarning && !useCopyPaste && apiKey) {
            setShowClearDialog(true);
        }
    };

    const handleClearApiKey = () => {
        setShowClearDialog(false);
        clearApiKeyWithUndo();
    };

    const handleKeepApiKey = () => {
        setShowClearDialog(false);
        setUseCopyPaste(true);
    };

    return (
        <>
        <header className={`glass-panel !py-2 rounded-none border-x-0 border-t-0 sticky top-0 z-50 mb-4 backdrop-blur-xl transition-all duration-300 ${headerMinimized ? '!py-1' : ''}`}>
            <div className="app-container flex flex-col items-start md:items-center py-1">
                <div className="flex flex-col items-start gap-3 relative w-max ml-12 md:ml-0">
                    {/* Floating Leading Icon */}
                    <div className={`absolute -left-16 top-0.5 p-2 bg-primary rounded-xl text-text-on-primary shadow-lg shadow-primary/30 transition-all duration-300 scale-75 ${headerMinimized ? '' : 'md:scale-100'}`}>
                        <Utensils className={`transition-all duration-300 w-5 h-5 ${headerMinimized ? '' : 'md:w-7 md:h-7'}`} />
                    </div>

                    {/* Title with inline toggle button */}
                    <div className="flex items-center gap-3">
                        <h1 className={`font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary transition-all duration-300 ${headerMinimized ? 'text-2xl' : 'text-2xl md:text-4xl'}`}>
                            AI Recipe Planner
                        </h1>

                        {/* API Key Warning Indicator (when minimized) */}
                        {headerMinimized && useCopyPaste && apiKey && (
                            <TooltipButton
                                icon={<AlertTriangle size={16} className="text-red-500" />}
                                tooltip={t.apiKeyStoredWarning}
                                ariaLabel={t.apiKeyStoredWarning}
                                className="!p-1 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setShowClearDialog(true)}
                            />
                        )}

                        {/* Sync Indicator (when minimized) — show for any non-idle state
                            so the button does not disappear during pulling/pushing. */}
                        {headerMinimized && syncStatus !== 'idle' && (
                            <TooltipButton
                                icon={syncIcon}
                                tooltip={syncTooltip}
                                ariaLabel={t.sync.openSettings}
                                className="!p-1 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setShowSyncDialog(true)}
                            />
                        )}

                        {/* Toggle Button */}
                        <button
                            onClick={() => setHeaderMinimized(!headerMinimized)}
                            className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors text-text-muted hover:text-primary"
                            aria-label={`${headerMinimized ? t.a11y.expand : t.a11y.collapse}: AI Recipe Planner`}
                            aria-expanded={!headerMinimized}
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

                            {/* Settings switches. One grid so icon, label, switch
                                and trailing affordance line up across all rows. */}
                            <div className="grid grid-cols-[auto_auto_auto_auto] items-center gap-x-2 gap-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <Toggle
                                    icon={<Key size={14} />}
                                    label={t.modeSwitch.label}
                                    checked={!useCopyPaste}
                                    onChange={handleModeToggle}
                                    trailing={
                                        useCopyPaste ? (
                                            apiKey ? (
                                                /* A key outliving API Key mode is worth flagging;
                                                   clicking offers to clear it. */
                                                <TooltipButton
                                                    icon={<AlertTriangle size={16} className="text-red-500" />}
                                                    tooltip={t.apiKeyStoredWarning}
                                                    ariaLabel={t.apiKeyStoredWarning}
                                                    className="!p-1 cursor-pointer hover:opacity-80 transition-opacity"
                                                    onClick={() => setShowClearDialog(true)}
                                                />
                                            ) : (
                                                <TooltipButton
                                                    icon={<Info size={14} className="text-text-muted" />}
                                                    tooltip={t.modeSwitch.tooltip}
                                                    ariaLabel={t.modeSwitch.tooltip}
                                                    className="!p-1"
                                                />
                                            )
                                        ) : (
                                            <TooltipButton
                                                icon={<Key size={14} className="text-text-muted" />}
                                                tooltip={t.apiKeyDialog.editTooltip}
                                                ariaLabel={t.apiKeyDialog.editTooltip}
                                                className="!p-1 cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => setApiDialogStep('key')}
                                            />
                                        )
                                    }
                                />

                                {!useCopyPaste && apiKey && (
                                    <Toggle
                                        icon={<ImageIcon size={14} />}
                                        label={t.imageGen.label}
                                        checked={imageGenEnabled}
                                        onChange={() => setImageGenEnabled(!imageGenEnabled)}
                                        trailing={
                                            <TooltipButton
                                                icon={<Info size={14} className="text-text-muted" />}
                                                tooltip={t.imageGen.tooltip}
                                                ariaLabel={t.imageGen.tooltip}
                                                className="!p-1"
                                            />
                                        }
                                    />
                                )}

                                {/* Both directions open the dialog: switching on needs a
                                    token, switching off discards one. */}
                                <Toggle
                                    icon={<Cloud size={14} />}
                                    label={t.sync.label}
                                    checked={syncStatus !== 'idle'}
                                    onChange={() => setShowSyncDialog(true)}
                                    opensDialog
                                    trailing={
                                        <TooltipButton
                                            icon={syncIcon}
                                            tooltip={syncTooltip}
                                            ariaLabel={t.sync.openSettings}
                                            className="!p-1 cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => setShowSyncDialog(true)}
                                        />
                                    }
                                />
                            </div>

                            {/* The select is transparent inside this pill, so a
                                rectangular outline on the select itself would cut
                                across it. The ring goes on the pill instead. */}
                            <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 p-1.5 rounded-full border border-[var(--glass-border)] animate-in fade-in slide-in-from-top-2 duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary has-[:focus-visible]:outline-offset-2">
                                <label htmlFor="language-select" className="sr-only">{t.languageLabel}</label>
                                <Globe size={16} className="ml-2 text-text-muted" aria-hidden="true" />
                                <select
                                    id="language-select"
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="bg-transparent border-none focus-visible:outline-none text-sm px-2 cursor-pointer font-medium text-text-main w-full"
                                    aria-label={t.languageLabel}
                                >
                                    <option value="German">Deutsch</option>
                                    <option value="English">English</option>
                                    <option value="Spanish">Español</option>
                                    <option value="French">Français</option>
                                </select>
                            </div>

                            {/* Export / Import — actions, not settings, hence
                                buttons rather than switches. */}
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <input
                                    ref={importFileRef}
                                    type="file"
                                    accept=".json"
                                    onChange={handleImportFile}
                                    className="hidden"
                                    aria-hidden="true"
                                    data-testid="import-file-input"
                                />
                                <TooltipButton
                                    icon={<Download size={16} />}
                                    tooltip={t.dataTransfer.exportData}
                                    ariaLabel={t.dataTransfer.exportData}
                                    className="p-2 bg-white/50 dark:bg-black/20 rounded-full border border-[var(--glass-border)] hover:bg-white/70 dark:hover:bg-black/40 transition-colors text-text-muted hover:text-primary cursor-pointer"
                                    onClick={handleExport}
                                />
                                <TooltipButton
                                    icon={<Upload size={16} />}
                                    tooltip={t.dataTransfer.importData}
                                    ariaLabel={t.dataTransfer.importData}
                                    className="p-2 bg-white/50 dark:bg-black/20 rounded-full border border-[var(--glass-border)] hover:bg-white/70 dark:hover:bg-black/40 transition-colors text-text-muted hover:text-primary cursor-pointer"
                                    onClick={handleImportClick}
                                />
                            </div>
                        </>
                    )}

                    {/* Anchored undo toast — renders in both minimized and expanded
                        states since clearApiKeyWithUndo can fire from either. */}
                    {notification?.anchor === 'api-key' && (
                        <UndoToast notification={notification} />
                    )}
                </div>
            </div>
        </header>

        {apiDialogStep && (
            <ApiKeyDialog
                step={apiDialogStep}
                onAcceptWarning={handleSecurityAccept}
                onSave={handleApiKeySave}
                onCancel={handleApiDialogCancel}
            />
        )}

        {showClearDialog && (
            <ClearApiKeyDialog
                onClear={handleClearApiKey}
                onKeep={handleKeepApiKey}
            />
        )}

        {showSyncDialog && (
            <GistSyncDialog
                onClose={() => setShowSyncDialog(false)}
                syncStatus={syncStatus}
                onShowError={(message) => onShowNotification({ message, type: 'error' })}
                onShowInfo={(message) => onShowNotification({ message, type: 'undo', timeout: 3000 })}
            />
        )}
        </>
    );
};
