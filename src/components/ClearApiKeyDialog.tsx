import { X, Key, Trash2 } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ClearApiKeyDialogProps {
    onClear: () => void;
    onKeep: () => void;
}

export const ClearApiKeyDialog = ({
    onClear,
    onKeep,
}: ClearApiKeyDialogProps) => {
    const { t } = useSettings();
    const dialogRef = useFocusTrap(onKeep);

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-api-key-dialog-title"
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="glass-panel w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200 outline-none"
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-xl">
                            <Key className="text-primary" size={24} />
                        </div>
                        <h2 id="clear-api-key-dialog-title" className="text-lg font-bold text-text-main">
                            {t.clearApiKey.title}
                        </h2>
                    </div>
                    <button
                        onClick={onKeep}
                        className="p-1.5 hover:bg-white/50 dark:hover:bg-black/30 rounded-full transition-colors text-text-muted hover:text-text-base focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                <p className="text-text-muted mb-6">
                    {t.clearApiKey.description}
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onKeep}
                        autoFocus
                        className="btn bg-white/50 hover:bg-white/70 dark:bg-black/30 dark:hover:bg-black/40 text-text-main w-full py-3 rounded-xl border border-[var(--glass-border)]"
                    >
                        {t.clearApiKey.keep}
                    </button>
                    <button
                        onClick={onClear}
                        className="btn bg-red-500 hover:bg-red-600 text-white w-full py-3 rounded-xl shadow-lg flex items-center justify-center gap-2"
                    >
                        <Trash2 size={18} />
                        {t.clearApiKey.clear}
                    </button>
                </div>
            </div>
        </div>
    );
};
