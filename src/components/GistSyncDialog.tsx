import { useState } from 'react';
import { ShieldAlert, AlertTriangle, ExternalLink, Cloud, Copy, X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { GIST_API, STORAGE_KEYS } from '../constants';
import {
    buildSyncPayload,
    createGist,
    GistNotFoundError,
    GistPayloadError,
    GistUnauthorizedError,
    isSyncEnabled,
    pullGist,
    applySyncPayload,
    readStoredSyncConfig,
    setSyncEnabled,
} from '../services/gistSync';
import type { SyncStatus } from '../hooks/useGistSync';

/** 'stored' is sync switched off with the token deliberately kept. */
type Step = 'warning' | 'setup' | 'active' | 'stored';

interface GistSyncDialogProps {
    onClose: () => void;
    syncStatus: SyncStatus;
    onShowError: (message: string) => void;
    onShowInfo: (message: string) => void;
}

const hasSeenWarning = (): boolean =>
    localStorage.getItem(STORAGE_KEYS.GIST_TOKEN_WARNING_SEEN) === 'true';

export const GistSyncDialog = ({
    onClose,
    syncStatus,
    onShowError,
    onShowInfo,
}: GistSyncDialogProps) => {
    const { t } = useSettings();
    // No button is a safe default in the warning and active steps. The setup
    // step is unaffected: its token input carries autoFocus, and the trap
    // leaves focus alone when something inside already holds it.
    const dialogRef = useFocusTrap(onClose, true);

    const initiallyConfigured = readStoredSyncConfig();
    const [step, setStep] = useState<Step>(() => {
        if (initiallyConfigured) return isSyncEnabled() ? 'active' : 'stored';
        return hasSeenWarning() ? 'setup' : 'warning';
    });

    const [tokenInput, setTokenInput] = useState('');
    const [gistIdInput, setGistIdInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [fieldError, setFieldError] = useState<string | null>(null);
    // Dialog-local error for the active step. The global notification toast is
    // rendered behind the dialog's backdrop, so errors triggered from within
    // the dialog (e.g. a clipboard failure) must be shown inline.
    const [copyError, setCopyError] = useState<string | null>(null);

    const mapErrorToMessage = (err: unknown): string => {
        if (err instanceof GistUnauthorizedError) return t.sync.errorUnauthorized;
        if (err instanceof GistNotFoundError) return t.sync.errorNotFound;
        if (err instanceof GistPayloadError) return t.sync.errorPayload;
        return t.sync.errorNetwork;
    };

    const handleAcceptWarning = () => {
        localStorage.setItem(STORAGE_KEYS.GIST_TOKEN_WARNING_SEEN, 'true');
        setStep('setup');
    };

    const persistConfig = (token: string, gistId: string) => {
        localStorage.setItem(STORAGE_KEYS.GIST_TOKEN, JSON.stringify(token));
        localStorage.setItem(STORAGE_KEYS.GIST_ID, JSON.stringify(gistId));
        // Setting sync up again clears an earlier switch-off, which would
        // otherwise leave the fresh config sitting there unused.
        setSyncEnabled(true);
    };

    const handleCreateNew = async () => {
        setFieldError(null);
        const token = tokenInput.trim();
        if (!token) {
            setFieldError(t.sync.errorTokenEmpty);
            return;
        }
        setBusy(true);
        try {
            const payload = buildSyncPayload();
            const newId = await createGist(token, payload);
            persistConfig(token, newId);
            localStorage.setItem(
                STORAGE_KEYS.SYNC_UPDATED_AT,
                JSON.stringify(payload.updatedAt),
            );
            // Reload so useGistSync initialises with the new config.
            window.location.reload();
        } catch (err) {
            onShowError(mapErrorToMessage(err));
            setBusy(false);
        }
    };

    const handleUseExisting = async () => {
        setFieldError(null);
        const token = tokenInput.trim();
        const gistId = gistIdInput.trim();
        if (!token) {
            setFieldError(t.sync.errorTokenEmpty);
            return;
        }
        if (!gistId) {
            setFieldError(t.sync.errorGistIdEmpty);
            return;
        }
        setBusy(true);
        try {
            const remote = await pullGist(token, gistId);
            persistConfig(token, gistId);
            if (remote) {
                applySyncPayload(remote);
                localStorage.setItem(
                    STORAGE_KEYS.SYNC_UPDATED_AT,
                    JSON.stringify(remote.updatedAt),
                );
            }
            // Reload so all components pick up the new localStorage values
            // and useGistSync initialises with the new config.
            window.location.reload();
        } catch (err) {
            onShowError(mapErrorToMessage(err));
            setBusy(false);
        }
    };

    /**
     * Switching sync off, with the token's fate decided by the button pressed —
     * the same two outcomes the API-key toggle offers. Keeping it flips the
     * per-device flag and leaves the credential in place; deleting it takes the
     * config back to its unconfigured state.
     */
    const handleDisable = (keepToken: boolean) => {
        if (keepToken) {
            setSyncEnabled(false);
        } else {
            localStorage.removeItem(STORAGE_KEYS.GIST_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.GIST_ID);
            localStorage.removeItem(STORAGE_KEYS.SYNC_UPDATED_AT);
            localStorage.removeItem(STORAGE_KEYS.SYNC_ENABLED);
        }
        // Reload to reset sync hook state cleanly. It also rules out an undo
        // toast here, which is why the dialog says the deletion is final.
        window.location.reload();
    };

    const handleCopyGistId = async () => {
        if (!initiallyConfigured) return;
        try {
            await navigator.clipboard.writeText(initiallyConfigured.gistId);
            setCopyError(null);
            onShowInfo(t.sync.gistIdCopied);
        } catch {
            // Clipboard failed — surface inline (toasts are hidden by the
            // dialog backdrop). Reuses the copy-paste translation key since
            // its wording ("select the text above and copy it manually")
            // fits the gist-id-above-the-button layout verbatim.
            setCopyError(t.copyPaste.copyFailed);
        }
    };

    const renderWarning = () => (
        <>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-warning/20 rounded-xl">
                    <ShieldAlert className="text-warning-text" size={24} />
                </div>
                <h2 id="sync-dialog-title" className="text-lg font-bold text-text-main">
                    {t.sync.securityTitle}
                </h2>
            </div>

            <p className="text-text-base mb-4">{t.sync.securityDescription}</p>

            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-warning-text mb-2">
                    {t.sync.securityRisks}
                </p>
                <ul className="space-y-2 text-sm text-text-muted">
                    {[t.sync.securityRisk1, t.sync.securityRisk2, t.sync.securityRisk3, t.sync.securityRisk4].map((risk, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <AlertTriangle className="text-warning-text shrink-0 mt-0.5" size={14} />
                            <span>{risk}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <p className="text-sm text-text-muted mb-6">{t.sync.securityRecommendation}</p>

            <div className="flex flex-col gap-3">
                <button
                    onClick={handleAcceptWarning}
                    className="btn btn-warning w-full py-3 rounded-xl"
                >
                    {t.sync.securityAccept}
                </button>
                <button
                    onClick={onClose}
                    className="btn btn-quiet w-full py-3 rounded-xl"
                >
                    {t.sync.securityCancel}
                </button>
            </div>
        </>
    );

    const renderSetup = () => (
        <>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/20 rounded-xl">
                    <Cloud className="text-primary" size={24} />
                </div>
                <h2 id="sync-dialog-title" className="text-lg font-bold text-text-main">
                    {t.sync.setupHeading}
                </h2>
            </div>

            <p className="text-text-base mb-4 text-sm">{t.sync.setupDescription}</p>

            <div className="space-y-3 mb-4">
                <div>
                    <label htmlFor="gist-token-input" className="block text-sm font-medium text-text-main mb-1">
                        {t.sync.tokenLabel}
                    </label>
                    <input
                        id="gist-token-input"
                        type="password"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder={t.sync.tokenPlaceholder}
                        disabled={busy}
                        className="w-full px-3 py-2 bg-white/50 dark:bg-black/20 border border-[var(--glass-border)] rounded-lg focus:border-primary text-sm"
                        autoFocus
                    />
                    <a
                        href={GIST_API.TOKEN_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                    >
                        {t.sync.getTokenLink}
                        <ExternalLink size={12} />
                    </a>
                </div>

                <div>
                    <label htmlFor="gist-id-input" className="block text-sm font-medium text-text-main mb-1">
                        {t.sync.gistIdLabel}
                    </label>
                    <input
                        id="gist-id-input"
                        type="text"
                        value={gistIdInput}
                        onChange={(e) => setGistIdInput(e.target.value)}
                        placeholder={t.sync.gistIdPlaceholder}
                        disabled={busy}
                        className="w-full px-3 py-2 bg-white/50 dark:bg-black/20 border border-[var(--glass-border)] rounded-lg focus:border-primary text-sm"
                    />
                </div>

                {fieldError && (
                    <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                        {fieldError}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-3">
                <button
                    onClick={handleCreateNew}
                    disabled={busy}
                    className="btn btn-warning w-full py-3 rounded-xl"
                >
                    {busy ? t.sync.creating : t.sync.createNew}
                </button>
                <button
                    onClick={handleUseExisting}
                    disabled={busy}
                    className="btn btn-warning w-full py-3 rounded-xl"
                >
                    {busy ? t.sync.connecting : t.sync.useExisting}
                </button>
                <button
                    onClick={onClose}
                    disabled={busy}
                    className="btn btn-quiet w-full py-2 rounded-xl"
                >
                    {t.sync.close}
                </button>
            </div>
        </>
    );

    const renderActive = () => {
        const gistId = initiallyConfigured?.gistId ?? '';
        // copyError takes precedence — it is a direct response to the user's
        // last click, while the sync-status error reflects background state.
        const errorMessage = copyError ?? (syncStatus === 'error' ? t.sync.errorTooltip : null);
        return (
            <>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/20 rounded-xl">
                        <Cloud className="text-primary" size={24} />
                    </div>
                    <h2 id="sync-dialog-title" className="text-lg font-bold text-text-main">
                        {t.sync.activeHeading}
                    </h2>
                </div>

                <div className="mb-4">
                    <p className="text-sm font-medium text-text-main mb-1">{t.sync.activeGistId}</p>
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 border border-[var(--glass-border)] rounded-lg px-3 py-2">
                        <code className="flex-1 text-xs text-text-base truncate">{gistId}</code>
                        <button
                            onClick={handleCopyGistId}
                            className="p-1 text-text-muted hover:text-primary transition-colors"
                            aria-label={t.sync.copyGistId}
                            title={t.sync.copyGistId}
                        >
                            <Copy size={14} />
                        </button>
                    </div>
                </div>

                {errorMessage && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
                    </div>
                )}

                <p className="text-sm text-text-muted mb-6">{t.sync.disableNote}</p>

                {/* Same three outcomes as the API-key toggle, in the same
                    colours: deleting the token ends the exposure, keeping it
                    carries it on, closing decides nothing and leaves sync
                    running. */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => handleDisable(false)}
                        className="btn btn-primary w-full py-3 rounded-xl"
                    >
                        {t.sync.disableAndClear}
                    </button>
                    <button
                        onClick={() => handleDisable(true)}
                        className="btn btn-warning w-full py-3 rounded-xl"
                    >
                        {t.sync.disableAndKeep}
                    </button>
                    <button
                        onClick={onClose}
                        className="btn btn-quiet w-full py-3 rounded-xl"
                    >
                        {t.sync.close}
                    </button>
                </div>
            </>
        );
    };

    /**
     * Sync off, token kept. Reached from the header warning rather than from
     * the switch — flipping that back on needs no dialog, since the stored
     * token is all it takes. Keeping the token changes nothing, so this variant
     * needs no third button.
     */
    const renderStored = () => (
        <>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-warning/20 rounded-xl">
                    <AlertTriangle className="text-warning-text" size={24} />
                </div>
                <h2 id="sync-dialog-title" className="text-lg font-bold text-text-main">
                    {t.sync.storedHeading}
                </h2>
            </div>

            <p className="text-sm text-text-muted mb-6">{t.sync.storedNote}</p>

            <div className="flex flex-col gap-3">
                <button
                    onClick={() => handleDisable(false)}
                    className="btn btn-primary w-full py-3 rounded-xl"
                >
                    {t.sync.storedClear}
                </button>
                <button
                    onClick={onClose}
                    className="btn btn-quiet w-full py-3 rounded-xl"
                >
                    {t.sync.storedKeep}
                </button>
            </div>
        </>
    );

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sync-dialog-title"
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="glass-panel w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 outline-none relative"
            >
                <button
                    onClick={onClose}
                    className="btn-icon absolute top-3 right-3 transition-colors"
                    aria-label={t.a11y.close}
                >
                    <X size={18} />
                </button>
                {step === 'warning' && renderWarning()}
                {step === 'setup' && renderSetup()}
                {step === 'active' && renderActive()}
                {step === 'stored' && renderStored()}
            </div>
        </div>
    );
};
