import { Camera, AlertTriangle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface PhotoPrivacyDialogProps {
    onAccept: () => void;
    onCancel: () => void;
    /**
     * What the photo is for. The exposure is identical either way — one image
     * goes to Google — so both purposes share this dialog and the single
     * PHOTO_PRIVACY_ACK: whoever accepted it once is never asked again. Only
     * the two sentences that would otherwise be wrong differ, because the
     * ingredient variant asks the user to keep documents out of the frame and
     * a recipe page is a document.
     */
    purpose?: 'ingredient' | 'recipe';
}

export const PhotoPrivacyDialog = ({ onAccept, onCancel, purpose = 'ingredient' }: PhotoPrivacyDialogProps) => {
    const { t } = useSettings();
    const dialogRef = useFocusTrap(onCancel, true);
    const isRecipe = purpose === 'recipe';
    const description = isRecipe ? t.photoPrivacy.recipeDescription : t.photoPrivacy.description;
    const note2 = isRecipe ? t.photoPrivacy.recipeNote2 : t.photoPrivacy.note2;

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
                    <div className="p-2 bg-warning/20 rounded-xl">
                        <Camera className="text-warning-text" size={24} />
                    </div>
                    <h2 id="photo-privacy-title" className="text-lg font-bold text-text-main">
                        {t.photoPrivacy.title}
                    </h2>
                </div>

                <p className="text-text-base mb-4">
                    {description}
                </p>

                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-warning-text mb-2">
                        {t.photoPrivacy.beforeYouSend}
                    </p>
                    <ul className="space-y-2 text-sm text-text-muted">
                        {[t.photoPrivacy.note1, note2].map((note) => (
                            <li key={note} className="flex items-start gap-2">
                                <AlertTriangle className="text-warning-text shrink-0 mt-0.5" size={14} />
                                <span>{note}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-sm text-text-muted mb-6">
                    {t.photoPrivacy.usage}
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onAccept}
                        className="btn btn-warning w-full py-3 rounded-xl"
                    >
                        {t.photoPrivacy.send}
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
