
import React from 'react';
import { Clock, ChefHat, AlertCircle } from 'lucide-react';
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
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-6 flex flex-col h-full"
        >
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-[var(--color-primary)]">{recipe.title}</h3>
                <div className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] bg-white/30 px-2 py-1 rounded-full">
                    <Clock size={14} />
                    <span>{recipe.time}</span>
                </div>
            </div>

            <div className="flex-1">
                <div className="mb-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--color-text-muted)]">
                        <ChefHat size={16} /> {t.ingredients}
                    </h4>
                    <ul className="text-sm space-y-2">
                        {recipe.ingredients.map((ing, i) => {
                            const isMissing = recipe.missingIngredients.some(m => m.item.toLowerCase().includes(ing.item.toLowerCase()));

                            return (
                                <li key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-dashed border-[var(--glass-border)] py-1 last:border-0 gap-1">
                                    <span className={`${isMissing ? "text-amber-600 dark:text-amber-400 font-medium" : "text-[var(--color-text-main)]"} break-words`}>
                                        {ing.item}
                                    </span>
                                    <span className="text-[var(--color-text-muted)] font-mono text-xs whitespace-nowrap bg-white/30 px-1.5 rounded self-start sm:self-auto">{ing.amount}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {recipe.missingIngredients.length > 0 && (
                    <div className="mb-4 bg-amber-50/50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100/50 dark:border-amber-800/30">
                        <h4 className="font-semibold mb-2 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                            <AlertCircle size={14} /> {t.needToBuy}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {recipe.missingIngredients.map((m, i) => (
                                <span key={i} className="text-xs bg-white/50 dark:bg-black/20 px-2 py-1 rounded text-amber-800 dark:text-amber-200 border border-amber-100 dark:border-amber-900">
                                    {m.item} ({m.amount})
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--color-text-muted)]">
                        {t.instructions}
                    </h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm opacity-90">
                        {recipe.instructions.map((step, i) => (
                            <li key={i} className="pl-1 marker:text-[var(--color-primary)] marker:font-bold">
                                {step}
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </motion.div>
    );
};
