import { useState, useRef } from 'react';
import { X, Copy, Check, AlertCircle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

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

    const handleCopyAndProceed = async () => {
        try {
            await navigator.clipboard.writeText(prompt);
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = prompt;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-border-base/30">
                    <div>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">
                            {t.copyPaste.title}
                        </h2>
                        <p className="text-sm text-text-muted mt-1">
                            {step === 'copy' ? t.copyPaste.step1Description : t.copyPaste.step2Description}
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-1.5 hover:bg-white/50 dark:hover:bg-black/30 rounded-full transition-colors text-text-muted hover:text-text-base"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center gap-2 px-6 py-3 bg-white/20 dark:bg-black/10">
                    <div className={`flex items-center gap-2 ${step === 'copy' ? 'text-primary font-medium' : 'text-text-muted'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'copy' ? 'bg-primary text-white' : 'bg-white/50 dark:bg-black/20'}`}>
                            1
                        </div>
                        <span className="text-sm">{t.copyPaste.stepCopy}</span>
                    </div>
                    <div className="flex-1 h-px bg-border-base/30" />
                    <div className={`flex items-center gap-2 ${step === 'paste' ? 'text-primary font-medium' : 'text-text-muted'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'paste' ? 'bg-primary text-white' : 'bg-white/50 dark:bg-black/20'}`}>
                            2
                        </div>
                        <span className="text-sm">{t.copyPaste.stepPaste}</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'copy' ? (
                        <div className="space-y-4">
                            <div className="flex items-start gap-2 text-sm text-text-muted bg-blue-500/10 rounded-lg p-3">
                                <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                <span>
                                    {t.copyPaste.instructions}{' '}
                                    <Copy size={14} className="inline-block align-text-bottom mx-0.5" />
                                    {' '}{t.copyPaste.instructionsEnd}
                                </span>
                            </div>
                            <div className="bg-white/30 dark:bg-black/20 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                                <pre className="text-xs text-text-base whitespace-pre-wrap font-mono">
                                    {prompt}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
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
                                className="w-full h-[300px] bg-white/30 dark:bg-black/20 rounded-lg p-4 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            {error && (
                                <div className="flex items-center gap-2 text-sm text-red-500">
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border-base/30">
                    {step === 'copy' ? (
                        <button
                            onClick={handleCopyAndProceed}
                            disabled={copied}
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
