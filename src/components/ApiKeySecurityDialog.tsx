import { useEffect, useRef } from 'react';
import { X, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface ApiKeySecurityDialogProps {
    onAccept: () => void;
    onUseCopyPaste: () => void;
}

export const ApiKeySecurityDialog = ({
    onAccept,
    onUseCopyPaste,
}: ApiKeySecurityDialogProps) => {
    const { t } = useSettings();
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onUseCopyPaste();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        dialogRef.current?.focus();

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onUseCopyPaste]);

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="security-dialog-title"
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="glass-panel w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 outline-none"
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-xl">
                            <ShieldAlert className="text-amber-500" size={24} />
                        </div>
                        <h2 id="security-dialog-title" className="text-lg font-bold text-text-main">
                            {t.apiKeySecurity.title}
                        </h2>
                    </div>
                    <button
                        onClick={onUseCopyPaste}
                        className="p-1.5 hover:bg-white/50 dark:hover:bg-black/30 rounded-full transition-colors text-text-muted hover:text-text-base"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                <p className="text-text-base mb-4">
                    {t.apiKeySecurity.description}
                </p>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                        {t.apiKeySecurity.risks}
                    </p>
                    <ul className="space-y-2 text-sm text-text-muted">
                        <li className="flex items-start gap-2">
                            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={14} />
                            <span>{t.apiKeySecurity.risk1}</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={14} />
                            <span>{t.apiKeySecurity.risk2}</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={14} />
                            <span>{t.apiKeySecurity.risk3}</span>
                        </li>
                    </ul>
                </div>

                <p className="text-sm text-text-muted mb-6">
                    {t.apiKeySecurity.recommendation}
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onAccept}
                        className="btn bg-amber-500 hover:bg-amber-600 text-white w-full py-3 rounded-xl shadow-lg"
                    >
                        {t.apiKeySecurity.understand}
                    </button>
                    <button
                        onClick={onUseCopyPaste}
                        className="btn btn-primary w-full py-3 rounded-xl shadow-lg shadow-primary/20"
                    >
                        {t.apiKeySecurity.useCopyPaste}
                    </button>
                </div>
            </div>
        </div>
    );
};
