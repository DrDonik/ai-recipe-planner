import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { useWakeLock } from './hooks/useWakeLock';
import { PantryInput, type PantryInputRef } from './components/PantryInput';
import { RecipeCard } from './components/RecipeCard';
import { SpiceRack, type SpiceRackRef } from './components/SpiceRack';
import { ShoppingList } from './components/ShoppingList';
import { WelcomeDialog } from './components/WelcomeDialog';
import { CopyPasteDialog } from './components/CopyPasteDialog';
import { generateRecipes, buildRecipePrompt, parseRecipeResponse, RecipeSchema, IngredientSchema } from './services/llm';
import type { PantryItem, MealPlan, Recipe, Ingredient, Notification } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { decodeFromUrl, generateShareUrl } from './utils/sharing';
import { Header } from './components/Header';
import { SettingsPanel, type SettingsPanelRef } from './components/SettingsPanel';
import { useSettings } from './contexts/SettingsContext';
import { STORAGE_KEYS, URL_PARAMS } from './constants';
import { z } from 'zod';

function App() {
  const pantryInputRef = useRef<PantryInputRef>(null);
  const settingsPanelRef = useRef<SettingsPanelRef>(null);
  const spiceRackRef = useRef<SpiceRackRef>(null);
  const { useCopyPaste, apiKey, people, meals, diet, styleWishes, language, t } = useSettings();

  const [pantryItems, setPantryItems] = useLocalStorage<PantryItem[]>(STORAGE_KEYS.PANTRY_ITEMS, []);
  const [spices, setSpices] = useLocalStorage<string[]>(STORAGE_KEYS.SPICE_RACK, []);

  const [headerMinimized, setHeaderMinimized] = useLocalStorage<boolean>(STORAGE_KEYS.HEADER_MINIMIZED, false);
  const [optionsMinimized, setOptionsMinimized] = useLocalStorage<boolean>(STORAGE_KEYS.OPTIONS_MINIMIZED, false);
  const [pantryMinimized, setPantryMinimized] = useLocalStorage<boolean>(STORAGE_KEYS.PANTRY_MINIMIZED, false);
  const [spiceRackMinimized, setSpiceRackMinimized] = useLocalStorage<boolean>(STORAGE_KEYS.SPICE_RACK_MINIMIZED, false);
  const [shoppingListMinimized, setShoppingListMinimized] = useLocalStorage<boolean>(STORAGE_KEYS.SHOPPING_LIST_MINIMIZED, false);
  const [recipeMissingIngredientsMinimized, setRecipeMissingIngredientsMinimized] = useLocalStorage<boolean>(STORAGE_KEYS.RECIPE_MISSING_INGREDIENTS_MINIMIZED, false);
  const [mealPlan, setMealPlan] = useLocalStorage<MealPlan | null>(STORAGE_KEYS.MEAL_PLAN, null);

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Welcome Dialog State
  const [showWelcome, setShowWelcome] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.WELCOME_DISMISSED) !== 'true';
  });

  // Copy-Paste Dialog State
  const [showCopyPasteDialog, setShowCopyPasteDialog] = useState(false);
  const [copyPastePrompt, setCopyPastePrompt] = useState('');

  // Single Recipe View State
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);
  // Single Shopping List View State
  const [viewShoppingList, setViewShoppingList] = useState<Ingredient[] | null>(null);

  // Wake Lock for keeping screen on during cooking
  // Note: Auto-activation was removed because Safari/iOS requires explicit user gesture
  // to acquire a wake lock. The button is prominently displayed for users to tap.
  const wakeLock = useWakeLock();

  // Memoized callbacks to prevent unnecessary re-renders
  const handleCloseWelcome = useCallback(() => setShowWelcome(false), []);
  const handleShowHelp = useCallback(() => setShowWelcome(true), []);
  const handleTogglePantryMinimize = useCallback(() => setPantryMinimized(!pantryMinimized), [pantryMinimized, setPantryMinimized]);
  const handleToggleSpiceRackMinimize = useCallback(() => setSpiceRackMinimized(!spiceRackMinimized), [spiceRackMinimized, setSpiceRackMinimized]);
  const handleToggleShoppingListMinimize = useCallback(() => setShoppingListMinimized(!shoppingListMinimized), [shoppingListMinimized, setShoppingListMinimized]);
  const handleToggleRecipeMissingIngredientsMinimize = useCallback(() => setRecipeMissingIngredientsMinimized(!recipeMissingIngredientsMinimized), [recipeMissingIngredientsMinimized, setRecipeMissingIngredientsMinimized]);

  const showNotification = useCallback((notif: Notification) => {
    // Clear any existing timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    setNotification(notif);
    // Auto-dismiss if timeout is set
    if (notif.timeout) {
      notificationTimeoutRef.current = setTimeout(() => {
        setNotification(null);
        notificationTimeoutRef.current = null;
      }, notif.timeout);
    }
  }, []);

  const clearNotification = useCallback(() => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    setNotification(null);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);


  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const recipeParam = searchParams.get(URL_PARAMS.RECIPE);
    const shoppingListParam = searchParams.get(URL_PARAMS.SHOPPING_LIST);

    if (recipeParam) {
      const decoded = decodeFromUrl<Recipe>(decodeURIComponent(recipeParam), RecipeSchema);
      if (decoded) {
        setViewRecipe(decoded);
      } else {
        // Invalid or malformed recipe data - show error
        showNotification({ message: t.invalidSharedData || "Invalid shared recipe data. The link may be corrupted.", type: 'error' });
      }
    } else if (shoppingListParam) {
      const decoded = decodeFromUrl<Ingredient[]>(decodeURIComponent(shoppingListParam), z.array(IngredientSchema));
      if (decoded) {
        setViewShoppingList(decoded);
      } else {
        // Invalid or malformed shopping list data - show error
        showNotification({ message: t.invalidSharedData || "Invalid shared shopping list data. The link may be corrupted.", type: 'error' });
      }
    }
  }, [t.invalidSharedData, showNotification]);

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

  const openRecipeView = useCallback((recipe: Recipe) => {
    setViewRecipe(recipe);
    // Update URL without reload
    const shareUrl = generateShareUrl(URL_PARAMS.RECIPE, recipe);
    window.history.pushState({}, '', shareUrl);
  }, []);

  const openShoppingListView = useCallback((items: Ingredient[]) => {
    setViewShoppingList(items);
    // Update URL without reload
    const shareUrl = generateShareUrl(URL_PARAMS.SHOPPING_LIST, items);
    window.history.pushState({}, '', shareUrl);
  }, []);

  const clearViewRecipe = useCallback(() => {
    setViewRecipe(null);
    // clean URL
    window.history.pushState({}, '', window.location.pathname);
  }, []);

  const clearViewShoppingList = useCallback(() => {
    setViewShoppingList(null);
    // clean URL
    window.history.pushState({}, '', window.location.pathname);
  }, []);

  const addPantryItem = (v: PantryItem) => {
    setPantryItems([...pantryItems, v]);
  };

  const removePantryItem = (id: string) => {
    setPantryItems(pantryItems.filter(v => v.id !== id));
  };

  const updatePantryItem = (id: string, newAmount: string) => {
    setPantryItems(pantryItems.map(item =>
      item.id === id ? { ...item, amount: newAmount } : item
    ));
  };

  const emptyPantry = () => {
    const backup = [...pantryItems];
    setPantryItems([]);
    showNotification({
      message: t.undo.pantryEmptied,
      type: 'undo',
      action: {
        label: t.undo.action,
        ariaLabel: `${t.undo.action} ${t.undo.pantryEmptied.toLowerCase()}`,
        onClick: () => {
          setPantryItems(backup);
          clearNotification();
        }
      },
      timeout: 5000
    });
  };

  const addSpice = (spice: string) => {
    if (!spices.includes(spice)) {
      setSpices([...spices, spice].sort((a, b) => a.localeCompare(b)));
    }
  };

  const removeSpice = (spiceToRemove: string) => {
    setSpices(spices.filter(s => s !== spiceToRemove));
  };

  const deleteRecipe = useCallback((recipeId: string) => {
    if (!mealPlan) return;
    const backup = mealPlan;
    const updatedRecipes = mealPlan.recipes.filter(r => r.id !== recipeId);
    if (updatedRecipes.length === 0) {
      setMealPlan(null);
    } else {
      setMealPlan({ ...mealPlan, recipes: updatedRecipes });
    }
    showNotification({
      message: t.undo.recipeDeleted,
      type: 'undo',
      action: {
        label: t.undo.action,
        ariaLabel: `${t.undo.action} ${t.undo.recipeDeleted.toLowerCase()}`,
        onClick: () => {
          setMealPlan(backup);
          clearNotification();
        }
      },
      timeout: 5000
    });
  }, [mealPlan, setMealPlan, showNotification, clearNotification, t.undo.recipeDeleted, t.undo.action]);

  const handleGenerate = async () => {
    // Flush any pending input from PantryInput, StyleWish or SpiceRack before generating
    const pendingItem = pantryInputRef.current?.flushPendingInput();
    const pendingStyleWish = settingsPanelRef.current?.flushPendingInput();
    const pendingSpice = spiceRackRef.current?.flushPendingInput();

    // If there was a pending item, include it in the pantry, style wishes or spicerack for generation
    const itemsToUse = pendingItem ? [...pantryItems, pendingItem] : pantryItems;
    const styleWishesToUse = pendingStyleWish ? [...styleWishes, pendingStyleWish] : styleWishes;
    const spicesToUse = pendingSpice ? [...spices, pendingSpice] : spices;

    // Handle copy-paste mode differently
    if (useCopyPaste) {
      const prompt = buildRecipePrompt({
        ingredients: itemsToUse,
        people,
        meals,
        diet,
        language,
        spices: spicesToUse,
        styleWishes: styleWishesToUse,
      });
      setCopyPastePrompt(prompt);
      setShowCopyPasteDialog(true);
      return;
    }

    // API mode - require API key
    if (!apiKey) {
      showNotification({ message: t.apiKeyError, type: 'error' });
      return;
    }

    setLoading(true);
    clearNotification();
    // Don't clear mealPlan here - preserve it on failure so user doesn't lose their previous plan

    try {
      const plan = await generateRecipes(apiKey, itemsToUse, people, meals, diet, language, spicesToUse, styleWishesToUse, t.errors);
      setMealPlan(plan);
      // Clear shopping list checkmarks when generating a new meal plan (scenario 9)
      localStorage.removeItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.generateError;
      showNotification({ message, type: 'error' });
      // Previous meal plan is preserved - user can still see their last successful generation
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPasteSubmit = (response: string) => {
    setShowCopyPasteDialog(false);
    setLoading(true);
    clearNotification();

    try {
      const plan = parseRecipeResponse(response, t.errors);
      setMealPlan(plan);
      localStorage.removeItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.parseError;
      showNotification({ message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPasteCancel = () => {
    setShowCopyPasteDialog(false);
  };


  if (viewRecipe) {
    return (
      <div className="min-h-screen bg-bg-app p-8 flex flex-col items-center justify-center">
        <div className="max-w-2xl w-full">
          <RecipeCard
            recipe={viewRecipe}
            index={0}
            isStandalone
            wakeLock={wakeLock}
            onClose={clearViewRecipe}
            missingIngredientsMinimized={recipeMissingIngredientsMinimized}
            onToggleMissingIngredientsMinimize={handleToggleRecipeMissingIngredientsMinimize}
            onShowNotification={showNotification}
          />
        </div>
      </div>
    );
  }

  if (viewShoppingList) {
    return (
      <div className="min-h-screen bg-bg-app p-8 flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full">
          <ShoppingList items={viewShoppingList} isStandaloneView={true} onClose={clearViewShoppingList} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {showWelcome && <WelcomeDialog onClose={handleCloseWelcome} />}
      {showCopyPasteDialog && (
        <CopyPasteDialog
          prompt={copyPastePrompt}
          onSubmit={handleCopyPasteSubmit}
          onCancel={handleCopyPasteCancel}
        />
      )}

      <Header
        headerMinimized={headerMinimized}
        setHeaderMinimized={setHeaderMinimized}
        onShowHelp={handleShowHelp}
        onShowNotification={showNotification}
        onClearNotification={clearNotification}
      />

      <main className="app-container flex flex-col gap-8">
        {/* Input Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          <div className="lg:col-span-1 space-y-6 relative z-10">
            <SettingsPanel
              ref={settingsPanelRef}
              optionsMinimized={optionsMinimized}
              setOptionsMinimized={setOptionsMinimized}
              loading={loading}
              handleGenerate={handleGenerate}
              notification={notification}
            />

            <PantryInput
              ref={pantryInputRef}
              pantryItems={pantryItems}
              onAddPantryItem={addPantryItem}
              onRemovePantryItem={removePantryItem}
              onUpdatePantryItem={updatePantryItem}
              onEmptyPantry={emptyPantry}
              isMinimized={pantryMinimized}
              onToggleMinimize={handleTogglePantryMinimize}
            />

            <SpiceRack
              ref={spiceRackRef}
              spices={spices}
              onAddSpice={addSpice}
              onRemoveSpice={removeSpice}
              isMinimized={spiceRackMinimized}
              onToggleMinimize={handleToggleSpiceRackMinimize}
            />
          </div>

          <div className="lg:col-span-2 space-y-8">
            {/* Divider between input and results sections - narrow viewport only */}
            <hr className="lg:hidden border-t-2 border-primary/30 -mt-4" />

            {mealPlan ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ShoppingList
                  key={mealPlan.recipes[0]?.id ?? 'shopping-list'}
                  items={mealPlan.shoppingList}
                  isMinimized={shoppingListMinimized}
                  onToggleMinimize={handleToggleShoppingListMinimize}
                  onViewSingle={() => openShoppingListView(mealPlan.shoppingList)}
                />

                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">
                      {t.menuTitle}
                    </span>
                  </h2>

                  {/* AI Disclaimer */}
                  <div className="mb-6 p-3 rounded-lg bg-white/30 dark:bg-black/30 backdrop-blur-sm border border-border-base/30">
                    <p className="text-xs text-text-muted leading-relaxed">
                      {t.aiDisclaimer}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    {mealPlan.recipes.map((recipe, index) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        index={index}
                        showOpenInNewTab={true}
                        onDelete={() => deleteRecipe(recipe.id)}
                        onViewSingle={() => openRecipeView(recipe)}
                        missingIngredientsMinimized={recipeMissingIngredientsMinimized}
                        onToggleMissingIngredientsMinimize={handleToggleRecipeMissingIngredientsMinimize}
                        onShowNotification={showNotification}
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
