import { useState } from 'react';
import { X, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { VALIDATION } from '../constants';
import type { Recipe } from '../types';

interface ReplaceRecipeDialogProps {
    /** The recipe being replaced — shown for context and kept on failure. */
    recipe: Recipe;
    onSubmit: (preference: string) => void;
    onCancel: () => void;
    /** Aborts the in-flight regeneration request. */
    onCancelGenerate: () => void;
    isLoading: boolean;
    error: string | null;
}

export const ReplaceRecipeDialog: React.FC<ReplaceRecipeDialogProps> = ({
    recipe,
    onSubmit,
    onCancel,
    onCancelGenerate,
    isLoading,
    error,
}) => {
    const { t } = useSettings();
    const [preference, setPreference] = useState('');

    // Escape / the close button aborts an in-flight request; otherwise it
    // dismisses the dialog without touching the existing recipe.
    const handleClose = () => {
        if (isLoading) onCancelGenerate();
        else onCancel();
    };
    const dialogRef = useFocusTrap(handleClose);

    const handleSubmit = () => {
        if (isLoading) return;
        onSubmit(preference);
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="replace-recipe-dialog-title"
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="glass-panel w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 outline-none"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-border-base/30">
                    <h2 id="replace-recipe-dialog-title" className="text-xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">
                        {t.replaceRecipe.title}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 bg-white/50 hover:bg-white/50 dark:bg-black/20 dark:hover:bg-black/30 rounded-full transition-colors text-text-muted hover:text-text-base focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label={t.replaceRecipe.cancel}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 min-h-0 flex flex-col gap-3">
                    <p className="text-sm text-text-muted">
                        {t.replaceRecipe.replacing}{' '}
                        <span className="font-semibold text-text-base">{recipe.title}</span>
                    </p>

                    <label htmlFor="replace-recipe-input" className="text-sm font-medium text-text-base">
                        {t.replaceRecipe.prompt}
                    </label>
                    <input
                        id="replace-recipe-input"
                        type="text"
                        autoFocus
                        value={preference}
                        maxLength={VALIDATION.MAX_INPUT_LENGTH}
                        disabled={isLoading}
                        onChange={(e) => setPreference(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
                        placeholder={t.replaceRecipe.placeholder}
                        className="w-full bg-white/30 dark:bg-black/20 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                    />
                    <p className="text-xs text-text-muted">{t.replaceRecipe.hint}</p>

                    {isLoading && (
                        <div className="flex items-center gap-2 text-sm text-text-muted">
                            <Loader2 size={16} className="animate-spin text-primary" />
                            <span>{t.replaceRecipe.generating}</span>
                        </div>
                    )}

                    {error && !isLoading && (
                        <div role="alert" aria-live="assertive" className="flex items-center gap-2 text-sm text-red-500">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-3 border-t border-border-base/30">
                    {/* Both buttons stay mounted across loading so focus and layout
                        don't shift; only their label/handler/disabled state changes. */}
                    <button
                        onClick={isLoading ? onCancelGenerate : onCancel}
                        className="btn flex items-center gap-2 px-4 py-2 rounded-lg bg-white/50 dark:bg-black/20 hover:bg-white/70 dark:hover:bg-black/30"
                    >
                        {isLoading ? t.replaceRecipe.cancelGeneration : t.replaceRecipe.cancel}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="btn btn-primary flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                        {t.replaceRecipe.submit}
                    </button>
                </div>
            </div>
        </div>
    );
};
