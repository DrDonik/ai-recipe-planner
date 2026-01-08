
import React from 'react';
import { Clock, ChefHat, AlertCircle, Share2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Recipe } from '../services/llm';
import { translations } from '../constants/translations';

interface RecipeCardProps {
    recipe: Recipe;
    index: number;
    language: string;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, index, language }) => {
    const t = translations[language as keyof typeof translations];

    const generateSchema = () => {
        const schema = {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": recipe.title,
            "cookTime": recipe.time.includes("min") ? `PT${recipe.time.replace(/[^0-9]/g, '')}M` : undefined,
            "recipeIngredient": recipe.ingredients.map(i => `${i.amount} ${i.item}`),
            "recipeInstructions": recipe.instructions.map(step => ({
                "@type": "HowToStep",
                "text": step
            }))
        };
        return JSON.stringify(schema);
    };

    // Generate URL for sharing and external link
    const json = JSON.stringify(recipe);
    // UTF-8 friendly base64 encoding
    const base64 = btoa(unescape(encodeURIComponent(json)));
    // Fix: encodeURIComponent because base64 can contain '+' which URLSearchParams treats as space
    const shareUrl = `${window.location.origin}${window.location.pathname}?recipe=${encodeURIComponent(base64)}`;

    const handleShare = async () => {
        // 1. Try Web Share API (Mobile/Modern)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: recipe.title,
                    url: shareUrl
                });
                return;
            } catch (err: any) {
                // If user restricted sharing or cancelled, don't show fallback
                if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
                    return;
                }
                console.log('Share API failed, trying clipboard...', err);
            }
        }

        // 2. Try Modern Clipboard API (Secure Contexts)
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(shareUrl);
                // Simple visual feedback
                const btn = document.activeElement as HTMLElement;
                const originalTitle = btn?.title;
                if (btn) btn.title = "Copied!";
                alert("Link copied!");
                if (btn) setTimeout(() => btn.title = originalTitle || "Share Recipe", 2000);
                return;
            }
        } catch (err) {
            console.log('Clipboard API failed, trying legacy...', err);
        }

        // 3. Fallback: Legacy execCommand('copy') (Works in some insecure contexts)
        try {
            const textArea = document.createElement("textarea");
            textArea.value = shareUrl;

            // Ensure it's not visible but part of DOM
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);

            textArea.focus();
            textArea.select();

            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (successful) {
                alert('Link copied to clipboard!');
                return;
            }
        } catch (err) {
            console.log('Legacy copy failed', err);
        }

        // 4. Ultimate Fallback: window.prompt
        window.prompt('Copy this link to share:', shareUrl);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-8 flex flex-col h-full relative group"
        >
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: generateSchema() }}
            />

            <div>
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl font-bold text-[var(--color-primary)] pr-4">{recipe.title}</h3>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-1 text-sm text-[var(--color-text-main)] bg-white/50 dark:bg-white/10 px-2 py-1 rounded-full whitespace-nowrap">
                            <Clock size={14} />
                            <span>{recipe.time}</span>
                        </div>
                        <div className="flex gap-2">
                            <a
                                href={shareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors focus:opacity-100 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                                title="Open in new tab"
                            >
                                <ExternalLink size={18} />
                            </a>
                            <button
                                onClick={handleShare}
                                className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors focus:opacity-100 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                                title="Share Recipe"
                            >
                                <Share2 size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1">
                    <div className="mb-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--color-text-muted)]">
                            <ChefHat size={16} /> {t.ingredients}
                        </h4>
                        <ul className="text-sm">
                            {recipe.ingredients.map((ing, i) => {
                                const isMissing = recipe.missingIngredients.some(m => m.item.toLowerCase().includes(ing.item.toLowerCase()));

                                return (
                                    <li key={i} className="flex flex-row items-center justify-between border-b border-dashed border-[var(--glass-border)] py-0.5 last:border-0 gap-3">
                                        <span className={`text-sm ${isMissing ? "text-amber-600 dark:text-amber-400 font-medium" : "text-[var(--color-text-main)]"} flex-1`}>
                                            {ing.item}
                                        </span>
                                        <span className="text-[var(--color-text-muted)] font-mono text-xs whitespace-nowrap bg-white/40 dark:bg-black/20 px-2 py-0.5 rounded">{ing.amount}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {recipe.missingIngredients.length > 0 && (
                        <div className="my-6 bg-amber-50/50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100/50 dark:border-amber-800/30">
                            <h4 className="font-semibold mb-2 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                                <AlertCircle size={14} /> {t.needToBuy}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {recipe.missingIngredients.map((m, i) => (
                                    <span key={i} className="inline-block text-xs bg-white/50 dark:bg-black/20 px-2 py-1 rounded text-amber-800 dark:text-amber-200 border border-amber-100 dark:border-amber-900">
                                        {m.item} <span className="opacity-75">({m.amount})</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--color-text-muted)]">
                            {t.instructions}
                        </h4>
                        <ol className="list-decimal list-inside space-y-4 text-sm opacity-90">
                            {recipe.instructions.map((step, i) => (
                                <li key={i} className="pl-1 marker:text-[var(--color-primary)] marker:font-bold">
                                    {step}
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
