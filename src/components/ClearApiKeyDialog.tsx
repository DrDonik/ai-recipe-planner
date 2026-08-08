import { Key } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ClearApiKeyDialogProps {
    /**
     * 'disable' gates the mode switch. The toggle has been flipped but nothing
     * is committed until one of the two switch-off buttons is pressed, so
     * Escape and Cancel leave API Key mode running — the switch cannot be
     * changed by an exit that decided nothing.
     *
     * 'cleanup' is the dialog reached from the header's warning icon, where the
     * mode is already off and only the leftover key is in question. Keeping it
     * changes nothing, so that variant needs no third button.
     */
    variant: 'disable' | 'cleanup';
    onClear: () => void;
    onKeep: () => void;
    onCancel: () => void;
}

export const ClearApiKeyDialog = ({
    variant,
    onClear,
    onKeep,
    onCancel,
}: ClearApiKeyDialogProps) => {
    const { t } = useSettings();
    // Escape changes nothing in either variant: in 'cleanup' that is the same
    // outcome as Keep, in 'disable' it is the way back to API Key mode.
    const dialogRef = useFocusTrap(onCancel, true);
    const isDisable = variant === 'disable';

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
                        {isDisable ? t.clearApiKey.disableTitle : t.clearApiKey.title}
                    </h2>
                </div>

                <p className="text-text-muted mb-6">
                    {isDisable ? t.clearApiKey.disableDescription : t.clearApiKey.description}
                </p>

                {/* Coloured by exposure, not by destructiveness: deleting the key
                    ends the exposure the dialog is about, keeping it carries the
                    exposure on, and cancelling leaves everything as it was. */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onClear}
                        className="btn btn-primary w-full py-3 rounded-xl"
                    >
                        {isDisable ? t.clearApiKey.disableAndClear : t.clearApiKey.clear}
                    </button>
                    <button
                        onClick={onKeep}
                        className={`btn ${isDisable ? 'btn-warning' : 'btn-quiet'} w-full py-3 rounded-xl`}
                    >
                        {isDisable ? t.clearApiKey.disableAndKeep : t.clearApiKey.keep}
                    </button>
                    {isDisable && (
                        <button
                            onClick={onCancel}
                            className="btn btn-quiet w-full py-3 rounded-xl"
                        >
                            {t.cancel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
