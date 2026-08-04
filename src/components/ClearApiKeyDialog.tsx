import { Key } from 'lucide-react';
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
    const dialogRef = useFocusTrap(onKeep, true);

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
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/20 rounded-xl">
                        <Key className="text-primary" size={24} />
                    </div>
                    <h2 id="clear-api-key-dialog-title" className="text-lg font-bold text-text-main">
                        {t.clearApiKey.title}
                    </h2>
                </div>

                <p className="text-text-muted mb-6">
                    {t.clearApiKey.description}
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onClear}
                        className="btn btn-primary w-full py-3 rounded-xl"
                    >
                        {t.clearApiKey.clear}
                    </button>
                    <button
                        onClick={onKeep}
                        className="btn btn-quiet w-full py-3 rounded-xl"
                    >
                        {t.clearApiKey.keep}
                    </button>
                </div>
            </div>
        </div>
    );
};
