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

/** What the dialog has to say about the user's last click. */
type Notice = { type: 'info' | 'error'; message: string };

interface GistSyncDialogProps {
    onClose: () => void;
    syncStatus: SyncStatus;
}

const hasSeenWarning = (): boolean =>
    localStorage.getItem(STORAGE_KEYS.GIST_TOKEN_WARNING_SEEN) === 'true';

export const GistSyncDialog = ({
    onClose,
    syncStatus,
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
    // One slot for everything this dialog has to say: the empty-field checks,
    // the network errors from the setup steps and both ends of the copy button.
    // The global toast is rendered behind the dialog's backdrop and sits
    // outside its focus trap, so feedback raised in here has to stay in here.
    const [notice, setNotice] = useState<Notice | null>(null);

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
        setNotice(null);
        const token = tokenInput.trim();
        if (!token) {
            setNotice({ type: 'error', message: t.sync.errorTokenEmpty });
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
            setNotice({ type: 'error', message: mapErrorToMessage(err) });
            setBusy(false);
        }
    };

    const handleUseExisting = async () => {
        setNotice(null);
        const token = tokenInput.trim();
        const gistId = gistIdInput.trim();
        if (!token) {
            setNotice({ type: 'error', message: t.sync.errorTokenEmpty });
            return;
        }
        if (!gistId) {
            setNotice({ type: 'error', message: t.sync.errorGistIdEmpty });
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
            setNotice({ type: 'error', message: mapErrorToMessage(err) });
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
            setNotice({ type: 'info', message: t.sync.gistIdCopied });
        } catch {
            // Both ends of one button, so they share the slot. The failure
            // reuses the copy-paste translation key since its wording ("select
            // the text above and copy it manually") fits the
            // gist-id-above-the-button layout verbatim.
            setNotice({ type: 'error', message: t.copyPaste.copyFailed });
        }
    };

    // The sync status only has something to add where sync is configured and
    // running. `notice` answers the user's last click and therefore outranks
    // it, which is also why the copy confirmation replaces a standing error.
    const statusError = step === 'active' && syncStatus === 'error' ? t.sync.errorTooltip : null;
    const feedback: Notice | null =
        notice ?? (statusError ? { type: 'error', message: statusError } : null);

    // Carries no role of its own: the permanent region at the foot of the
    // dialog announces it, and a second role here would say it twice.
    const noticeBlock = feedback && (
        <div
            className={`mb-4 rounded-lg border p-3 ${
                feedback.type === 'error'
                    ? 'bg-danger/10 border-danger/30'
                    : 'bg-warning/10 border-warning/30'
            }`}
        >
            <p className={`text-sm ${feedback.type === 'error' ? 'text-danger-text' : 'text-warning-text'}`}>
                {feedback.message}
            </p>
        </div>
    );

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
                    {t.cancel}
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
            </div>

            {noticeBlock}

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
                    {t.cancel}
                </button>
            </div>
        </>
    );

    const renderActive = () => {
        const gistId = initiallyConfigured?.gistId ?? '';
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

                {noticeBlock}

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
                        {t.cancel}
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

                {/* Permanent and outside the steps: a region that appears
                    together with the text it carries stays silent. One region
                    for the whole dialog, so a copy that succeeded and a copy
                    that failed cannot talk over each other. */}
                <p className="sr-only" role="status">{feedback?.message ?? ''}</p>
            </div>
        </div>
    );
};
