import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Per-recipe cooking progress: which ingredients have been crossed off and
 * which instruction step is highlighted. Like the cooking timers (see
 * TimerContext), this state is kept in memory only — it survives a card
 * remount (e.g. closing the focus view and reopening it) but intentionally
 * does not persist across a reload, matching the lifetime of a cooking
 * session. Keyed by the recipe's stable identity (`recipe.id ?? recipe.title`).
 */

export interface RecipeProgress {
  struckIngredients: Set<number>;
  activeStep: number | null;
}

// Shared read-only default for recipes with no recorded progress yet. Returning
// the same reference keeps consumers stable until the user actually interacts.
const EMPTY_PROGRESS: RecipeProgress = { struckIngredients: new Set(), activeStep: null };

interface CookingProgressContextValue {
  getProgress: (key: string) => RecipeProgress;
  toggleIngredient: (key: string, idx: number) => void;
  toggleStep: (key: string, idx: number) => void;
}

const CookingProgressContext = createContext<CookingProgressContextValue | undefined>(undefined);

export const CookingProgressProvider = ({ children }: { children: ReactNode }) => {
  const [progress, setProgress] = useState<Record<string, RecipeProgress>>({});

  const getProgress = useCallback(
    (key: string) => progress[key] ?? EMPTY_PROGRESS,
    [progress]
  );

  const toggleIngredient = useCallback((key: string, idx: number) => {
    setProgress((prev) => {
      const current = prev[key] ?? EMPTY_PROGRESS;
      const struckIngredients = new Set(current.struckIngredients);
      if (struckIngredients.has(idx)) {
        struckIngredients.delete(idx);
      } else {
        struckIngredients.add(idx);
      }
      return { ...prev, [key]: { ...current, struckIngredients } };
    });
  }, []);

  const toggleStep = useCallback((key: string, idx: number) => {
    setProgress((prev) => {
      const current = prev[key] ?? EMPTY_PROGRESS;
      return { ...prev, [key]: { ...current, activeStep: current.activeStep === idx ? null : idx } };
    });
  }, []);

  const value = useMemo<CookingProgressContextValue>(
    () => ({ getProgress, toggleIngredient, toggleStep }),
    [getProgress, toggleIngredient, toggleStep]
  );

  return <CookingProgressContext.Provider value={value}>{children}</CookingProgressContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCookingProgress = () => {
  const context = useContext(CookingProgressContext);
  if (context === undefined) {
    throw new Error('useCookingProgress must be used within a CookingProgressProvider');
  }
  return context;
};
