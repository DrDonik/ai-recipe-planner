import { useEffect, useRef, useState } from 'react';
import { X, Camera, Loader2, AlertCircle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { VALIDATION } from '../constants';
import { transcribeRecipeFromImage, TranscribeRecipeError } from '../services/llm';
import { downscaleImage } from '../utils/imageDownscale';

interface OwnRecipeDialogProps {
    onSubmit: (recipe: string) => void;
    onCancel: () => void;
    /**
     * Open the camera straight away. Set when the dialog was reached through
     * the camera button, which is the usual route: the photo is what most
     * recipes arrive as, and requiring a second click to start it would tax
     * the common case for the sake of the rare typed one.
     */
    autoStartCamera?: boolean;
}

/**
 * Collects a whole recipe the user brings along, photographed or typed.
 *
 * The transcription lands in an editable textarea rather than going straight
 * into storage: a photographed page — handwriting especially — is never read
 * perfectly, and a wrong quantity spotted here costs one keystroke, while the
 * same mistake found in a finished meal plan costs the plan.
 *
 * The photo consent is settled by the caller before this dialog opens, so no
 * second dialog ever stacks on top of this one.
 */
export const OwnRecipeDialog: React.FC<OwnRecipeDialogProps> = ({
    onSubmit,
    onCancel,
    autoStartCamera = false,
}) => {
    const { t, apiKey } = useSettings();
    const [text, setText] = useState('');
    const [transcribing, setTranscribing] = useState(false);
    const [transcribed, setTranscribed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    const handleClose = () => {
        abortRef.current?.abort();
        onCancel();
    };
    const dialogRef = useFocusTrap(handleClose);

    // Every state this operation can be in, in one region: a running read, a
    // finished one and a failure are the same concern, and separate regions
    // for them would talk over each other.
    const announcement = error ?? (transcribing ? t.ownRecipe.transcribing : transcribed ? t.ownRecipe.transcribed : '');

    const cameraEnabled = !!apiKey;

    const openFilePicker = () => {
        setError(null);
        fileInputRef.current?.click();
    };

    // Opening the picker from an effect is allowed only because the click that
    // opened this dialog is still the activating gesture. The input is clicked
    // directly rather than through openFilePicker: there is no error to clear
    // on mount, and setting state here would only cascade a render.
    useEffect(() => {
        if (autoStartCamera && cameraEnabled) fileInputRef.current?.click();
        // Once, on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => () => abortRef.current?.abort(), []);

    const handleCameraClick = () => {
        if (transcribing) {
            abortRef.current?.abort();
            return;
        }
        openFilePicker();
    };

    const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Reset the input so picking the same file twice in a row still triggers change.
        e.target.value = '';
        if (!file || !apiKey) return;

        setError(null);
        setTranscribed(false);
        setTranscribing(true);
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            let base64: string;
            let mimeType: string;
            try {
                // 2048px rather than the 1024px default: that value is sized for
                // a single ingredient filling the frame, and a page of body text
                // shot at it comes back with unreadable quantities.
                ({ base64, mimeType } = await downscaleImage(file, 2048, 0.9));
            } catch (decodeErr) {
                const detail = decodeErr instanceof Error ? decodeErr.message : String(decodeErr);
                throw new TranscribeRecipeError('decode', detail, { cause: decodeErr });
            }
            const recipe = await transcribeRecipeFromImage(apiKey, base64, mimeType, controller.signal);
            // Appended rather than replacing, so a second shot picks up the back
            // of a card or the column that ran onto the next page.
            setText(prev => (prev.trim() ? `${prev.trimEnd()}\n\n${recipe}` : recipe).slice(0, VALIDATION.MAX_RECIPE_LENGTH));
            setTranscribed(true);
            // Deferred until `disabled` clears — focus() on a disabled field is a no-op.
            setTimeout(() => textareaRef.current?.focus(), 0);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                setTimeout(() => textareaRef.current?.focus(), 0);
                return;
            }
            const kind = err instanceof TranscribeRecipeError ? err.kind : 'error';
            const detail = err instanceof Error ? err.message : '';
            const base =
                kind === 'unreadable' ? t.ownRecipe.unreadable
                : kind === 'quota' ? t.ownRecipe.quotaExceeded
                : kind === 'decode' ? t.ownRecipe.decodeFailed
                : t.ownRecipe.error;
            setError((kind === 'decode' || kind === 'error') && detail ? `${base} (${detail})` : base);
        } finally {
            setTranscribing(false);
            abortRef.current = null;
        }
    };

    const handleSubmit = () => {
        const trimmed = text.trim();
        if (!trimmed || transcribing) return;
        onSubmit(trimmed);
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="own-recipe-dialog-title"
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 outline-none"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-border-base/30">
                    <h2 id="own-recipe-dialog-title" className="text-xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">
                        {t.ownRecipe.title}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="btn-icon transition-colors"
                        aria-label={t.a11y.close}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Outside the conditional content below, so the region outlives
                    the messages it carries — one mounted alongside its first
                    message is announced by almost no screen reader. */}
                <p className="sr-only" role="status">{announcement}</p>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 min-h-0 flex flex-col gap-3">
                    <label htmlFor="own-recipe-input" className="text-sm font-medium text-text-base">
                        {t.ownRecipe.hint}
                    </label>
                    <textarea
                        id="own-recipe-input"
                        ref={textareaRef}
                        rows={12}
                        value={text}
                        maxLength={VALIDATION.MAX_RECIPE_LENGTH}
                        disabled={transcribing}
                        aria-busy={transcribing}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={transcribing ? t.ownRecipe.transcribing : t.ownRecipe.placeholder}
                        className="w-full bg-white/30 dark:bg-black/20 rounded-lg p-3 text-sm resize-y disabled:opacity-50"
                    />

                    {cameraEnabled && (
                        <div>
                            {/* No aria-label: the visible words are the name
                                (SC 2.5.3), and an aria-label repeating the row
                                button's name would put two identically named
                                controls on the page. While a read is running
                                the button cancels it, so it says so — the
                                progress itself is announced by the region
                                above. */}
                            <button
                                type="button"
                                onClick={handleCameraClick}
                                className="btn btn-quiet flex items-center gap-2 px-4 py-2 rounded-lg"
                            >
                                {transcribing ? (
                                    <Loader2 size={18} className="animate-spin text-primary" aria-hidden="true" />
                                ) : (
                                    <Camera size={18} aria-hidden="true" />
                                )}
                                <span>{transcribing ? t.ownRecipe.cancelRead : t.ownRecipe.addPhoto}</span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handlePhotoSelected}
                                className="hidden"
                                aria-hidden="true"
                                tabIndex={-1}
                            />
                        </div>
                    )}

                    {error && (
                        <div role="alert" className="flex items-start gap-2 text-sm text-danger-text">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-3 border-t border-border-base/30">
                    <button
                        onClick={handleClose}
                        className="btn btn-quiet flex items-center gap-2 px-4 py-2 rounded-lg"
                    >
                        {t.cancel}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!text.trim() || transcribing}
                        className="btn btn-primary flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t.ownRecipe.add}
                    </button>
                </div>
            </div>
        </div>
    );
};
