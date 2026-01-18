import React, { useState } from 'react';
import { Clock, ChefHat, AlertCircle, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Recipe } from '../services/llm';
import { generateShareUrl } from '../utils/sharing';
import { useSettings } from '../contexts/SettingsContext';

interface RecipeCardProps {
    recipe: Recipe;
    index: number;
    showOpenInNewTab?: boolean;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, index, showOpenInNewTab = false }) => {
    const { t } = useSettings();
    const [struckIngredients, setStruckIngredients] = useState<Set<number>>(new Set());
    const [activeStep, setActiveStep] = useState<number | null>(null);

    const toggleIngredient = (idx: number) => {
        setStruckIngredients(prev => {
            const next = new Set(prev);
            if (next.has(idx)) {
                next.delete(idx);
            } else {
                next.add(idx);
            }
            return next;
        });
    };

    const toggleStepHighlight = (idx: number) => {
        setActiveStep(prev => prev === idx ? null : idx);
    };

    const generateSchema = () => {
        const schema = {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": recipe.title,
            "description": `A recipe for ${recipe.title}`,
            "recipeIngredient": recipe.ingredients.map(i => `${i.amount} ${i.item}`),
            "recipeInstructions": recipe.instructions.map(step => ({
                "@type": "HowToStep",
                "text": step
            }))
        };
        return JSON.stringify(schema);
    };

    // Generate URL for external link
    const shareUrl = generateShareUrl('recipe', recipe);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-8 flex flex-col h-full relative group"
        >
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: generateSchema() }} />

            {showOpenInNewTab && (
                <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center text-text-muted hover:text-primary"
                    title={t.openInNewTab}
                >
                    <ExternalLink size={18} />
                </a>
            )}

            <div className="flex items-start justify-between mb-6 pr-8">
                <h3 className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors">
                    {recipe.title}
                </h3>
            </div>

            <div className="flex items-center gap-6 mb-8 text-sm font-medium">
                <div className="flex items-center gap-2 text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                    <Clock size={16} />
                    {recipe.time}
                </div>
            </div>

            <div className="space-y-8 flex-grow">
                <section>
                    <div className="flex items-center gap-2 mb-4 text-secondary">
                        <ChefHat size={20} />
                        <h4 className="font-bold uppercase tracking-wider text-xs">{t.ingredients}</h4>
                    </div>
                    <ul className="space-y-3">
                        {recipe.ingredients.map((ing, idx) => (
                            <li key={idx} className="flex items-center justify-between text-sm group/item">
                                <span
                                    className={`flex items-center gap-3 transition-all cursor-pointer ${struckIngredients.has(idx) ? 'line-through opacity-50 text-text-muted' : 'text-text-main'}`}
                                    onClick={() => toggleIngredient(idx)}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover/item:scale-125 transition-transform" />
                                    {ing.item}
                                </span>
                                <span className="text-text-muted font-medium bg-white/40 dark:bg-white/5 px-2 py-0.5 rounded border border-[var(--glass-border)]">
                                    {ing.amount}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>

                {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                    <section className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-400">
                            <AlertCircle size={18} />
                            <h4 className="font-bold uppercase tracking-wider text-xs">{t.needToBuy}</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {recipe.missingIngredients.map((ing, idx) => (
                                <span key={idx} className="bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-semibold border border-amber-500/10">
                                    {ing.amount} {ing.item}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                <section>
                    <h4 className="font-bold uppercase tracking-wider text-xs text-text-muted mb-4 flex items-center gap-2">
                        <div className="w-1 h-4 bg-primary rounded-full" />
                        {t.instructions}
                    </h4>
                    <div className="space-y-4">
                        {recipe.instructions.map((step, idx) => (
                            <div
                                key={idx}
                                onClick={() => toggleStepHighlight(idx)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer group/step
                  ${activeStep === idx
                                        ? 'bg-primary/5 border-primary/30 shadow-sm'
                                        : 'bg-white/30 dark:bg-black/10 border-[var(--glass-border)] hover:bg-white/50 dark:hover:bg-black/20'}`}
                            >
                                <div className="flex gap-4">
                                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                    ${activeStep === idx
                                            ? 'bg-primary text-white'
                                            : 'bg-[var(--glass-border)] text-text-muted group-hover/step:bg-primary/20'}`}>
                                        {idx + 1}
                                    </span>
                                    <p className={`text-sm leading-relaxed transition-colors ${activeStep === idx ? 'text-text-main' : 'text-text-muted'}`}>
                                        {step}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </motion.div>
    );
};
