import { useState } from 'react';
import { ShieldAlert, AlertTriangle, ExternalLink, Key, X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { API_CONFIG } from '../constants';

export type ApiKeyDialogStep = 'warning' | 'key';

interface ApiKeyDialogProps {
    /** Controlled by the header so it can persist the acknowledgement. */
    step: ApiKeyDialogStep;
    onAcceptWarning: () => void;
    onSave: (key: string) => void;
    onCancel: () => void;
}

/**
 * Two-step counterpart to GistSyncDialog for the Gemini API key: the storage
 * warning, then the key itself. Keeping the key here rather than in the header
 * matches how the Gist token is handled, and keeps a credential that is never
 * displayed again out of the permanent chrome.
 */
export const ApiKeyDialog = ({ step, onAcceptWarning, onSave, onCancel }: ApiKeyDialogProps) => {
    const { apiKey, t } = useSettings();
    const dialogRef = useFocusTrap(onCancel, true);

    const [keyInput, setKeyInput] = useState(apiKey);
    const [fieldError, setFieldError] = useState<string | null>(null);

    const handleSave = () => {
        const key = keyInput.trim();
        if (!key) {
            setFieldError(t.apiKeyDialog.errorEmpty);
            return;
        }
        onSave(key);
    };

    const renderWarning = () => (
        <>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-warning/20 rounded-xl">
                    <ShieldAlert className="text-warning-text" size={24} />
                </div>
                <h2 id="api-key-dialog-title" className="text-lg font-bold text-text-main">
                    {t.apiKeySecurity.title}
                </h2>
            </div>

            <p className="text-text-base mb-4">{t.apiKeySecurity.description}</p>

            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-warning-text mb-2">
                    {t.apiKeySecurity.risks}
                </p>
                <ul className="space-y-2 text-sm text-text-muted">
                    {[t.apiKeySecurity.risk1, t.apiKeySecurity.risk2, t.apiKeySecurity.risk3, t.apiKeySecurity.risk4].map((risk, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <AlertTriangle className="text-warning-text shrink-0 mt-0.5" size={14} />
                            <span>{risk}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <p className="text-sm text-text-muted mb-6">{t.apiKeySecurity.usage}</p>

            <div className="flex flex-col gap-3">
                <button
                    onClick={onAcceptWarning}
                    className="btn btn-warning w-full py-3 rounded-xl"
                >
                    {t.apiKeySecurity.understand}
                </button>
                <button
                    onClick={onCancel}
                    className="btn btn-quiet w-full py-3 rounded-xl"
                >
                    {t.apiKeySecurity.cancel}
                </button>
            </div>
        </>
    );

    const renderKey = () => (
        <>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/20 rounded-xl">
                    <Key className="text-primary" size={24} />
                </div>
                <h2 id="api-key-dialog-title" className="text-lg font-bold text-text-main">
                    {t.apiKeyDialog.heading}
                </h2>
            </div>

            <p className="text-text-base mb-4 text-sm">{t.apiKeyDialog.description}</p>

            <div className="space-y-3 mb-4">
                <div>
                    <label htmlFor="api-key-input" className="block text-sm font-medium text-text-main mb-1">
                        {t.apiKeyLabel}
                    </label>
                    <input
                        id="api-key-input"
                        type="password"
                        value={keyInput}
                        onChange={(e) => {
                            setKeyInput(e.target.value);
                            // Typing is the repair, so the complaint goes away
                            // with the condition that caused it.
                            setFieldError(null);
                        }}
                        placeholder={t.apiKeyPlaceholder}
                        className="w-full px-3 py-2 bg-white/50 dark:bg-black/20 border border-[var(--glass-border)] rounded-lg outline-none focus:border-primary text-sm"
                        autoFocus
                    />
                    <a
                        href={API_CONFIG.KEY_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                    >
                        {t.getApiKey}
                        <ExternalLink size={12} />
                    </a>
                </div>

                {fieldError && (
                    <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                        {fieldError}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-3">
                <button
                    onClick={handleSave}
                    className="btn btn-warning w-full py-3 rounded-xl"
                >
                    {t.apiKeyDialog.save}
                </button>
                <button
                    onClick={onCancel}
                    className="btn btn-quiet w-full py-3 rounded-xl"
                >
                    {t.apiKeyDialog.cancel}
                </button>
            </div>
        </>
    );

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="api-key-dialog-title"
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="glass-panel w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 outline-none relative"
            >
                <button
                    onClick={onCancel}
                    className="absolute top-3 right-3 p-1 text-text-muted hover:text-text-main rounded-full transition-colors"
                    aria-label={t.apiKeyDialog.cancel}
                >
                    <X size={18} />
                </button>
                {step === 'warning' ? renderWarning() : renderKey()}
            </div>
        </div>
    );
};
