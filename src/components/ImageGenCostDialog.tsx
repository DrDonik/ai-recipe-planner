import { Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ImageGenCostDialogProps {
    onAccept: () => void;
    onCancel: () => void;
}

/**
 * Asked once, on the first click of a Generate-image button — the same shape
 * and the same contract as `PhotoPrivacyDialog`.
 *
 * It replaces the header switch that used to gate image generation. The switch
 * was a setting in one place for a button in another, and it disappeared
 * entirely without a key; this asks at the moment the money is spent, which is
 * where the question belongs. Accepting is recorded, so it is asked once per
 * device and never again.
 */
export const ImageGenCostDialog = ({ onAccept, onCancel }: ImageGenCostDialogProps) => {
    const { t } = useSettings();
    const dialogRef = useFocusTrap(onCancel, true);

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-gen-cost-title"
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="glass-panel w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 outline-none"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-warning/20 rounded-xl">
                        <ImageIcon className="text-warning-text" size={24} />
                    </div>
                    <h2 id="image-gen-cost-title" className="text-lg font-bold text-text-main">
                        {t.imageGenCost.title}
                    </h2>
                </div>

                <p className="text-text-base mb-4">
                    {t.imageGenCost.description}
                </p>

                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-warning-text mb-2">
                        {t.imageGenCost.beforeYouStart}
                    </p>
                    <ul className="space-y-2 text-sm text-text-muted">
                        {[t.imageGenCost.note1, t.imageGenCost.note2].map((note) => (
                            <li key={note} className="flex items-start gap-2">
                                <AlertTriangle className="text-warning-text shrink-0 mt-0.5" size={14} />
                                <span>{note}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-sm text-text-muted mb-6">
                    {t.imageGenCost.usage}
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onAccept}
                        className="btn btn-warning w-full py-3 rounded-xl"
                    >
                        {t.imageGenCost.generate}
                    </button>
                    <button
                        onClick={onCancel}
                        className="btn btn-quiet w-full py-3 rounded-xl"
                    >
                        {t.cancel}
                    </button>
                </div>
            </div>
        </div>
    );
};
