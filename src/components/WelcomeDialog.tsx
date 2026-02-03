import { useState } from 'react';
import { Refrigerator, Leaf, Utensils, Key, ClipboardCopy, Sparkles, HardDrive } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { STORAGE_KEYS } from '../constants';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface WelcomeDialogProps {
    onClose: () => void;
}

export const WelcomeDialog: React.FC<WelcomeDialogProps> = ({ onClose }) => {
    const { t } = useSettings();
    const [dontShowAgain, setDontShowAgain] = useState(() => {
        return localStorage.getItem(STORAGE_KEYS.WELCOME_DISMISSED) === 'true';
    });
    const dialogRef = useFocusTrap(onClose);

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem(STORAGE_KEYS.WELCOME_DISMISSED, 'true');
        } else {
            localStorage.removeItem(STORAGE_KEYS.WELCOME_DISMISSED);
        }
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-dialog-title"
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="glass-panel w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95 duration-200 outline-none"
            >
                <h2 id="welcome-dialog-title" className="text-xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text mb-4">
                    {t.welcome.title}
                </h2>

                <p className="text-text-base mb-5">
                    {t.welcome.intro}
                </p>

                <div className="space-y-4">
                    <div className="flex gap-3">
                        <Refrigerator className="text-primary shrink-0 mt-0.5" size={20} />
                        <p className="text-sm text-text-muted">{t.welcome.pantry}</p>
                    </div>

                    <div className="flex gap-3">
                        <Leaf className="text-primary shrink-0 mt-0.5" size={20} />
                        <p className="text-sm text-text-muted">{t.welcome.spiceRack}</p>
                    </div>

                    <div className="flex gap-3">
                        <Utensils className="text-secondary shrink-0 mt-0.5" size={20} />
                        <p className="text-sm text-text-muted">{t.welcome.settings}</p>
                    </div>

                    <div className="flex gap-3">
                        <ClipboardCopy className="text-secondary shrink-0 mt-0.5" size={20} />
                        <p className="text-sm text-text-muted">{t.welcome.copyPasteMode}</p>
                    </div>

                    <div className="flex gap-3">
                        <Key className="text-secondary shrink-0 mt-0.5" size={20} />
                        <p className="text-sm text-text-muted">{t.welcome.apiKey}</p>
                    </div>

                    <div className="flex gap-3">
                        <Sparkles className="text-primary shrink-0 mt-0.5" size={20} />
                        <p className="text-sm text-text-muted">{t.welcome.generates}</p>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent my-4" />

                    <div className="flex gap-3">
                        <HardDrive className="text-amber-500 shrink-0 mt-0.5" size={20} />
                        <p className="text-sm text-text-muted">{t.welcome.localStorage}</p>
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-text-muted hover:text-text-base transition-colors">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="w-4 h-4 rounded border-border-base text-primary focus:ring-primary/50"
                        />
                        {t.welcome.dontShowAgain}
                    </label>

                    <button
                        onClick={handleClose}
                        autoFocus
                        className="btn btn-primary w-full py-3 rounded-xl shadow-lg shadow-primary/20"
                    >
                        {t.welcome.getStarted}
                    </button>
                </div>
            </div>
        </div>
    );
};
