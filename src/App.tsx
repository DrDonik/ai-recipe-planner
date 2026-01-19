import { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { PantryInput, type PantryInputRef } from './components/PantryInput';
import { RecipeCard } from './components/RecipeCard';
import { SpiceRack } from './components/SpiceRack';
import { ShoppingList } from './components/ShoppingList';
import { generateRecipes } from './services/llm';
import type { PantryItem, MealPlan, Recipe, Ingredient } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { decodeFromUrl } from './utils/sharing';
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { useSettings } from './contexts/SettingsContext';
import { STORAGE_KEYS, URL_PARAMS } from './constants';

function App() {
  const pantryInputRef = useRef<PantryInputRef>(null);
  const { apiKey, people, meals, diet, styleWishes, language, t } = useSettings();

  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [spices, setSpices] = useLocalStorage<string[]>(STORAGE_KEYS.SPICE_RACK, []);

  const [headerMinimized, setHeaderMinimized] = useLocalStorage<boolean>(STORAGE_KEYS.HEADER_MINIMIZED, false);
  const [optionsMinimized, setOptionsMinimized] = useLocalStorage<boolean>(STORAGE_KEYS.OPTIONS_MINIMIZED, false);
  const [pantryMinimized, setPantryMinimized] = useLocalStorage<boolean>(STORAGE_KEYS.PANTRY_MINIMIZED, false);
  const [spiceRackMinimized, setSpiceRackMinimized] = useLocalStorage<boolean>(STORAGE_KEYS.SPICE_RACK_MINIMIZED, false);
  const [shoppingListMinimized, setShoppingListMinimized] = useLocalStorage<boolean>(STORAGE_KEYS.SHOPPING_LIST_MINIMIZED, false);
  const [mealPlan, setMealPlan] = useLocalStorage<MealPlan | null>(STORAGE_KEYS.MEAL_PLAN, null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single Recipe View State
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);
  // Single Shopping List View State
  const [viewShoppingList, setViewShoppingList] = useState<Ingredient[] | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const recipeParam = searchParams.get(URL_PARAMS.RECIPE);
    const shoppingListParam = searchParams.get(URL_PARAMS.SHOPPING_LIST);

    if (recipeParam) {
      const decoded = decodeFromUrl<Recipe>(decodeURIComponent(recipeParam));
      if (decoded) setViewRecipe(decoded);
    } else if (shoppingListParam) {
      const decoded = decodeFromUrl<Ingredient[]>(decodeURIComponent(shoppingListParam));
      if (decoded) setViewShoppingList(decoded);
    }
  }, []);

  useEffect(() => {
    const updateMetaTags = (title: string, description: string, url: string) => {
      // Update title
      document.title = title;

      // Update Open Graph tags
      const ogTitle = document.getElementById('og-title');
      const ogDescription = document.getElementById('og-description');
      const ogUrl = document.getElementById('og-url');

      if (ogTitle) ogTitle.setAttribute('content', title);
      if (ogDescription) ogDescription.setAttribute('content', description);
      if (ogUrl) ogUrl.setAttribute('content', url);

      // Update Twitter tags
      const twitterTitle = document.getElementById('twitter-title');
      const twitterDescription = document.getElementById('twitter-description');

      if (twitterTitle) twitterTitle.setAttribute('content', title);
      if (twitterDescription) twitterDescription.setAttribute('content', description);
    };

    if (viewRecipe) {
      const title = `${viewRecipe.title} | AI Recipe Planner`;
      const description = viewRecipe.ingredients.slice(0, 3).map(i => i.item).join(', ') +
        (viewRecipe.ingredients.length > 3 ? '...' : '');
      const url = window.location.href;
      updateMetaTags(title, description, url);
    } else if (viewShoppingList) {
      const title = `${t.shoppingList} | AI Recipe Planner`;
      const description = 'Your shopping list from AI Recipe Planner';
      const url = window.location.href;
      updateMetaTags(title, description, url);
    } else {
      const title = 'AI Recipe Planner';
      const description = 'Turn your pantry into delicious meal plans with AI';
      const url = window.location.origin + window.location.pathname;
      updateMetaTags(title, description, url);
    }
  }, [viewRecipe, viewShoppingList, t.shoppingList]);

  const clearViewRecipe = () => {
    setViewRecipe(null);
    // clean URL
    window.history.pushState({}, '', window.location.pathname);
  };

  const clearViewShoppingList = () => {
    setViewShoppingList(null);
    // clean URL
    window.history.pushState({}, '', window.location.pathname);
  };

  const addPantryItem = (v: PantryItem) => {
    setPantryItems([...pantryItems, v]);
  };

  const removePantryItem = (id: string) => {
    setPantryItems(pantryItems.filter(v => v.id !== id));
  };

  const addSpice = (spice: string) => {
    if (!spices.includes(spice)) {
      setSpices([...spices, spice].sort((a, b) => a.localeCompare(b)));
    }
  };

  const removeSpice = (spiceToRemove: string) => {
    setSpices(spices.filter(s => s !== spiceToRemove));
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      setError(t.apiKeyError);
      return;
    }

    // Flush any pending input from PantryInput before generating
    const pendingItem = pantryInputRef.current?.flushPendingInput();

    // If there was a pending item, include it in the pantry for generation
    const itemsToUse = pendingItem ? [...pantryItems, pendingItem] : pantryItems;

    setLoading(true);
    setError(null);
    // Don't clear mealPlan here - preserve it on failure so user doesn't lose their previous plan

    try {
      const plan = await generateRecipes(apiKey, itemsToUse, people, meals, diet, language, spices, styleWishes);
      setMealPlan(plan);
      // Clear shopping list checkmarks when generating a new meal plan (scenario 9)
      localStorage.removeItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong generating recipes.";
      setError(message);
      // Previous meal plan is preserved - user can still see their last successful generation
    } finally {
      setLoading(false);
    }
  };


  if (viewRecipe) {
    return (
      <div className="min-h-screen bg-bg-app p-8 flex flex-col items-center justify-center">
        <div className="max-w-2xl w-full">
          <RecipeCard recipe={viewRecipe} index={0} />
          <button
            onClick={clearViewRecipe}
            className="mt-8 text-primary hover:underline flex items-center justify-center gap-2 w-full font-medium"
          >
            ← {t.openMyPlanner}
          </button>
        </div>
      </div>
    );
  }

  if (viewShoppingList) {
    return (
      <div className="min-h-screen bg-bg-app p-8 flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full">
          <ShoppingList items={viewShoppingList} isStandaloneView={true} />
          <button
            onClick={clearViewShoppingList}
            className="mt-8 text-primary hover:underline flex items-center justify-center gap-2 w-full font-medium"
          >
            ← {t.openMyPlanner}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Header
        headerMinimized={headerMinimized}
        setHeaderMinimized={setHeaderMinimized}
      />

      <main className="app-container flex flex-col gap-8">
        {/* Input Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          <div className="lg:col-span-1 space-y-6 relative z-10">
            <SettingsPanel
              optionsMinimized={optionsMinimized}
              setOptionsMinimized={setOptionsMinimized}
              loading={loading}
              handleGenerate={handleGenerate}
              error={error}
            />

            <PantryInput
              ref={pantryInputRef}
              pantryItems={pantryItems}
              onAddPantryItem={addPantryItem}
              onRemovePantryItem={removePantryItem}
              isMinimized={pantryMinimized}
              onToggleMinimize={() => setPantryMinimized(!pantryMinimized)}
            />

            <SpiceRack
              spices={spices}
              onAddSpice={addSpice}
              onRemoveSpice={removeSpice}
              isMinimized={spiceRackMinimized}
              onToggleMinimize={() => setSpiceRackMinimized(!spiceRackMinimized)}
            />
          </div>

          <div className="lg:col-span-2 space-y-8">
            {mealPlan ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ShoppingList
                  key={mealPlan.recipes[0]?.id ?? 'shopping-list'}
                  items={mealPlan.shoppingList}
                  isMinimized={shoppingListMinimized}
                  onToggleMinimize={() => setShoppingListMinimized(!shoppingListMinimized)}
                />

                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">
                      {t.menuTitle}
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {mealPlan.recipes.map((recipe, index) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        index={index}
                        showOpenInNewTab={true}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center text-text-muted p-8 border-2 border-dashed border-border-base/30 rounded-xl bg-white/20">
                <div className="bg-white/40 p-6 rounded-full mb-4">
                  <Sparkles size={48} className="text-primary/50" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t.ready}</h3>
                <p className="max-w-md">{t.readyDesc}</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
