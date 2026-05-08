import { Camera } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface PhotoPrivacyDialogProps {
    onAccept: () => void;
    onCancel: () => void;
}

export const PhotoPrivacyDialog = ({ onAccept, onCancel }: PhotoPrivacyDialogProps) => {
    const { t } = useSettings();
    const dialogRef = useFocusTrap(onCancel);

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-privacy-title"
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="glass-panel w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 outline-none"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/20 rounded-xl">
                        <Camera className="text-primary" size={24} />
                    </div>
                    <h2 id="photo-privacy-title" className="text-lg font-bold text-text-main">
                        {t.photoPrivacy.title}
                    </h2>
                </div>

                <p className="text-text-base mb-4">
                    {t.photoPrivacy.description}
                </p>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
                    <p className="text-sm text-text-muted">
                        {t.photoPrivacy.note}
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onAccept}
                        autoFocus
                        className="btn btn-primary w-full py-3 rounded-xl shadow-lg shadow-primary/20"
                    >
                        {t.photoPrivacy.understand}
                    </button>
                    <button
                        onClick={onCancel}
                        className="btn bg-white/10 hover:bg-white/20 text-text-main w-full py-3 rounded-xl"
                    >
                        {t.photoPrivacy.cancel}
                    </button>
                </div>
            </div>
        </div>
    );
};
