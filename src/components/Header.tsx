import React, { useState, useRef } from 'react';
import { Utensils, Key, Globe, ChevronUp, ChevronDown, CircleHelp, AlertTriangle, Download, Upload, Cloud, CloudOff, Loader2, Info, Sparkles, Pencil } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { STORAGE_KEYS } from '../constants';
import { ApiKeyDialog, type ApiKeyDialogStep } from './ApiKeyDialog';
import { ClearApiKeyDialog } from './ClearApiKeyDialog';
import { GistSyncDialog } from './GistSyncDialog';
import { TooltipButton } from './ui/TooltipButton';
import { Toggle } from './ui/Toggle';
import { UndoToast } from './ui/UndoToast';
import { isSyncEnabled, readStoredSyncConfig, setSyncEnabled } from '../services/gistSync';
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
    const { useCopyPaste, setUseCopyPaste, apiKey, setApiKey, language, setLanguage, t } = useSettings();

    // Check on mount if existing user needs to see the security warning. A
    // stored key is always in use now, so the mode no longer enters into it.
    const [apiDialogStep, setApiDialogStep] = useState<ApiKeyDialogStep | null>(
        () => (!hasSeenApiKeyWarning() && !!apiKey ? 'warning' : null)
    );
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [showSyncDialog, setShowSyncDialog] = useState(false);
    const importFileRef = useRef<HTMLInputElement>(null);

    // Sync config as stored on this device, read at render because every path
    // that changes it reloads the page. `syncKeptOff` is a token that outlived
    // the feature it was entered for — the state the API key no longer has,
    // which is why only sync's switch-off asks a third question.
    const syncKeptOff = readStoredSyncConfig() !== null && !isSyncEnabled();

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
                return <Cloud size={16} className="text-danger-text" />;
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
        const backupMode = useCopyPaste;
        setApiKey('');
        // Direct generation is the one capability that cannot outlive the key,
        // so it falls back to Copy & Paste; the others simply stop being
        // offered. The undo restores whichever mode was running.
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
                    setUseCopyPaste(backupMode);
                    onClearNotification();
                }
            },
            timeout: 5000
        });
    };

    const handleModeToggle = () => {
        // Switching to Copy & Paste changes where the meal plan comes from and
        // nothing else: the key stays, and photo recognition, chat, storage
        // tips, images and replacement keep running on it. So the switch-off
        // commits on the spot — no dialog gates a decision about a credential
        // this flip does not touch.
        if (!useCopyPaste) {
            setUseCopyPaste(true);
            return;
        }

        // Switching to direct generation is the one capability that needs the
        // key. With one stored the switch commits; without one the dialog
        // collects it, behind the storage warning on first use.
        if (apiKey) {
            setUseCopyPaste(false);
            return;
        }
        setApiDialogStep(hasSeenApiKeyWarning() ? 'key' : 'warning');
    };

    const handleApiKeyToggle = () => {
        // The one switch that owns the key, so it is allowed to gate it. Both
        // directions open a dialog and neither commits here: switching on, the
        // key dialog stores the key (behind the storage warning on first use);
        // switching off, ClearApiKeyDialog decides. Unlike sync there is no
        // third exit, because a key kept is a key in use — the switch has no
        // stored-but-off state to land in.
        if (apiKey) {
            setShowClearDialog(true);
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
        // acknowledging it, so a later attempt must ask again — same as the Gist
        // and photo dialogs, which only record consent on accept.
        const declinedWarning = apiDialogStep === 'warning';
        setApiDialogStep(null);

        // Declining the warning while a key is already stored is the on-mount
        // case for existing users: they have not agreed to storing it, so offer
        // to delete it. Every other cancel leaves everything untouched.
        if (declinedWarning && apiKey) {
            setShowClearDialog(true);
        }
    };

    const handleClearApiKey = () => {
        setShowClearDialog(false);
        clearApiKeyWithUndo();
    };

    // Keeping the key changes nothing at all, so this is also where Escape
    // lands and what the dialog's second button does.
    const handleKeepApiKey = () => setShowClearDialog(false);

    // Deleting is reached from inside the key dialog, which steps aside for it
    // rather than stacking a second modal on top of itself.
    const handleRequestApiKeyDeletion = () => {
        setApiDialogStep(null);
        setShowClearDialog(true);
    };

    const handleSyncToggle = () => {
        // A token kept from an earlier switch-off is all sync needs, so turning
        // it back on asks nothing — the same shortcut API Key mode takes when a
        // key is already stored.
        if (syncKeptOff) {
            setSyncEnabled(true);
            window.location.reload();
            return;
        }
        setShowSyncDialog(true);
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
                            {t.appTitle}
                        </h1>

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

                        {/* A token outliving sync is worth the same flag as a key
                            outliving API Key mode — sync is idle here, so the
                            indicator above stays hidden. */}
                        {headerMinimized && syncKeptOff && (
                            <TooltipButton
                                icon={<AlertTriangle size={16} className="text-danger-text" />}
                                tooltip={t.sync.tokenStoredWarning}
                                ariaLabel={t.sync.tokenStoredWarning}
                                className="!p-1 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setShowSyncDialog(true)}
                            />
                        )}

                        {/* Toggle Button */}
                        <button
                            onClick={() => setHeaderMinimized(!headerMinimized)}
                            className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors text-text-muted hover:text-primary"
                            aria-label={`${headerMinimized ? t.a11y.expand : t.a11y.collapse}: ${t.appTitle}`}
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
                                    icon={<Sparkles size={14} />}
                                    label={t.modeSwitch.label}
                                    checked={!useCopyPaste}
                                    onChange={handleModeToggle}
                                    /* Only the flip that opens one: switching on
                                       without a key. Every other flip commits on
                                       the spot, in both directions. */
                                    opensDialog={useCopyPaste && !apiKey}
                                    trailing={
                                        <TooltipButton
                                            icon={<Info size={14} className="text-text-muted" />}
                                            tooltip={t.modeSwitch.tooltip}
                                            ariaLabel={`${t.a11y.info}: ${t.modeSwitch.label}`}
                                            className="!p-1"
                                        />
                                    }
                                />

                                {/* The key is a stored credential like the Gist
                                    token, so it gets the same shape: a switch that
                                    is on exactly when the key is stored, and reads
                                    as one at a glance rather than as an icon that
                                    happens to be clickable. Independent of the
                                    mode — with a key stored it is what photo
                                    recognition, tips, images, replacement and chat
                                    run on, in Copy & Paste too. */}
                                <Toggle
                                    icon={<Key size={14} />}
                                    label={t.apiKeyDialog.heading}
                                    checked={!!apiKey}
                                    onChange={handleApiKeyToggle}
                                    opensDialog
                                    trailing={
                                        apiKey ? (
                                            <TooltipButton
                                                icon={<Pencil size={14} className="text-text-muted" />}
                                                tooltip={t.apiKeyDialog.editTooltip}
                                                ariaLabel={t.apiKeyDialog.editTooltip}
                                                className="!p-1 cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => setApiDialogStep('key')}
                                            />
                                        ) : (
                                            <TooltipButton
                                                icon={<Info size={14} className="text-text-muted" />}
                                                tooltip={t.apiKeyDialog.tooltip}
                                                ariaLabel={`${t.a11y.info}: ${t.apiKeyDialog.heading}`}
                                                className="!p-1"
                                            />
                                        )
                                    }
                                />

                                {/* Switching on needs a token and switching off asks
                                    what becomes of it — except with a token kept
                                    from an earlier switch-off, which turns sync
                                    back on directly. */}
                                <Toggle
                                    icon={<Cloud size={14} />}
                                    label={t.sync.label}
                                    checked={syncStatus !== 'idle'}
                                    onChange={handleSyncToggle}
                                    opensDialog={!syncKeptOff}
                                    trailing={
                                        syncKeptOff ? (
                                            <TooltipButton
                                                icon={<AlertTriangle size={16} className="text-danger-text" />}
                                                tooltip={t.sync.tokenStoredWarning}
                                                ariaLabel={t.sync.tokenStoredWarning}
                                                className="!p-1 cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => setShowSyncDialog(true)}
                                            />
                                        ) : (
                                            <TooltipButton
                                                icon={syncIcon}
                                                tooltip={syncTooltip}
                                                ariaLabel={t.sync.openSettings}
                                                className="!p-1 cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => setShowSyncDialog(true)}
                                            />
                                        )
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
                onDelete={handleRequestApiKeyDeletion}
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
