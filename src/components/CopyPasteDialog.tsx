import { useState, useRef } from 'react';
import { X, Copy, Check, AlertCircle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface CopyPasteDialogProps {
    prompt: string;
    onSubmit: (response: string) => void;
    onCancel: () => void;
}

type Step = 'copy' | 'paste';

export const CopyPasteDialog: React.FC<CopyPasteDialogProps> = ({
    prompt,
    onSubmit,
    onCancel,
}) => {
    const { t } = useSettings();
    const [step, setStep] = useState<Step>('copy');
    const [copied, setCopied] = useState(false);
    const [response, setResponse] = useState('');
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dialogRef = useFocusTrap(onCancel);

    const handleCopyAndProceed = async () => {
        try {
            await navigator.clipboard.writeText(prompt);
        } catch {
            // Clipboard write failed — user can still copy the prompt text manually
        }
        setCopied(true);
        // Advance to paste step after a brief moment to show "Copied!" feedback
        setTimeout(() => {
            setStep('paste');
            setCopied(false);
            setTimeout(() => textareaRef.current?.focus(), 100);
        }, 600);
    };

    const handleSubmit = () => {
        if (!response.trim()) {
            setError(t.copyPaste.responseRequired);
            return;
        }
        setError(null);
        onSubmit(response);
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="copy-paste-dialog-title"
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 outline-none"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-border-base/30">
                    <h2 id="copy-paste-dialog-title" className="text-xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">
                        {t.copyPaste.title}
                    </h2>
                    <button
                        onClick={onCancel}
                        className="p-2 bg-white/50 hover:bg-white/50 dark:bg-black/20 dark:hover:bg-black/30 rounded-full transition-colors text-text-muted hover:text-text-base focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 min-h-0 flex flex-col gap-2">
                    {step === 'copy' ? (
                        <>
                            <div className="flex items-start gap-2 text-sm text-text-muted bg-blue-500/10 rounded-lg p-3">
                                <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                <span>
                                    {t.copyPaste.instructions}{' '}
                                    <Copy size={14} className="inline-block align-text-bottom mx-0.5" />
                                    {' '}{t.copyPaste.instructionsEnd}
                                </span>
                            </div>
                            <div className="bg-white/30 dark:bg-black/20 rounded-lg p-3 flex-1 overflow-y-auto">
                                <pre className="text-xs text-text-base whitespace-pre-wrap font-mono">
                                    {prompt}
                                </pre>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-start gap-2 text-sm text-text-muted bg-blue-500/10 rounded-lg p-3">
                                <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                <span>
                                    {t.copyPaste.instructionsPaste}{' '}
                                    <Copy size={14} className="inline-block align-text-bottom mx-0.5" />
                                    {' '}{t.copyPaste.instructionsPasteEnd}
                                </span>
                            </div>
                            <textarea
                                ref={textareaRef}
                                value={response}
                                onChange={(e) => {
                                    setResponse(e.target.value);
                                    setError(null);
                                }}
                                placeholder={t.copyPaste.responsePlaceholder}
                                className="w-full flex-1 bg-white/30 dark:bg-black/20 rounded-lg p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            {error && (
                                <div
                                    role="alert"
                                    aria-live="assertive"
                                    className="flex items-center gap-2 text-sm text-red-500"
                                >
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-3 border-t border-border-base/30">
                    {step === 'copy' ? (
                        <button
                            onClick={handleCopyAndProceed}
                            disabled={copied}
                            autoFocus
                            className={`btn btn-primary flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg min-w-[160px] transition-colors ${
                                copied ? '!bg-green-500' : ''
                            }`}
                        >
                            {copied ? (
                                <>
                                    <Check size={18} />
                                    {t.copyPaste.copied}
                                </>
                            ) : (
                                <>
                                    <Copy size={18} />
                                    {t.copyPaste.copyPrompt}
                                </>
                            )}
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setStep('copy')}
                                className="btn flex items-center gap-2 px-4 py-2 rounded-lg bg-white/50 dark:bg-black/20 hover:bg-white/70 dark:hover:bg-black/30"
                            >
                                {t.copyPaste.back}
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="btn btn-primary flex items-center gap-2 px-4 py-2 rounded-lg"
                            >
                                {t.copyPaste.submit}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
