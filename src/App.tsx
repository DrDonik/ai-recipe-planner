import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { useWakeLock } from './hooks/useWakeLock';
import { useGistSync } from './hooks/useGistSync';
import { PantryInput, type PantryInputRef } from './components/PantryInput';
import { RecipeCard } from './components/RecipeCard';
import { SpiceRack, type SpiceRackRef } from './components/SpiceRack';
import { KitchenAppliances, type KitchenAppliancesRef } from './components/KitchenAppliances';
import { ShoppingList } from './components/ShoppingList';
import { WelcomeDialog } from './components/WelcomeDialog';
import { CopyPasteDialog } from './components/CopyPasteDialog';
import { generateRecipes, buildRecipePrompt, parseRecipeResponse } from './services/llm';
import type { PantryItem, MealPlan, Recipe, Ingredient, Notification } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateShareUrl } from './utils/sharing';
import { parseSharedUrlParams } from './utils/sharedUrlParams';
import { Header } from './components/Header';
import { SettingsPanel, type SettingsPanelRef } from './components/SettingsPanel';
import { useSettings } from './contexts/SettingsContext';
import { STORAGE_KEYS, URL_PARAMS } from './constants';

function App() {
  const pantryInputRef = useRef<PantryInputRef>(null);
  const settingsPanelRef = useRef<SettingsPanelRef>(null);
  const spiceRackRef = useRef<SpiceRackRef>(null);
  const kitchenAppliancesRef = useRef<KitchenAppliancesRef>(null);
  const savedScrollPositionRef = useRef<number>(0);
  const prevViewRecipeRef = useRef<Recipe | null>(null);
  const prevViewShoppingListRef = useRef<Ingredient[] | null>(null);
  const { useCopyPaste, apiKey, people, meals, diet, styleWishes, language, t, storagePersistError } = useSettings();

  const [pantryItems, setPantryItems, pantryPersistError] = useLocalStorage<PantryItem[]>(STORAGE_KEYS.PANTRY_ITEMS, []);
  const [spices, setSpices, spicesPersistError] = useLocalStorage<string[]>(STORAGE_KEYS.SPICE_RACK, []);
  const [appliances, setAppliances, appliancesPersistError] = useLocalStorage<string[]>(STORAGE_KEYS.KITCHEN_APPLIANCES, []);

  const [headerMinimized, setHeaderMinimized, headerMinPersistError] = useLocalStorage<boolean>(STORAGE_KEYS.HEADER_MINIMIZED, false);
  const [optionsMinimized, setOptionsMinimized, optionsMinPersistError] = useLocalStorage<boolean>(STORAGE_KEYS.OPTIONS_MINIMIZED, false);
  const [pantryMinimized, setPantryMinimized, pantryMinPersistError] = useLocalStorage<boolean>(STORAGE_KEYS.PANTRY_MINIMIZED, false);
  const [spiceRackMinimized, setSpiceRackMinimized, spiceRackMinPersistError] = useLocalStorage<boolean>(STORAGE_KEYS.SPICE_RACK_MINIMIZED, false);
  const [kitchenAppliancesMinimized, setKitchenAppliancesMinimized, kitchenAppliancesMinPersistError] = useLocalStorage<boolean>(STORAGE_KEYS.KITCHEN_APPLIANCES_MINIMIZED, false);
  const [shoppingListMinimized, setShoppingListMinimized, shoppingListMinPersistError] = useLocalStorage<boolean>(STORAGE_KEYS.SHOPPING_LIST_MINIMIZED, false);
  const [recipeMissingIngredientsMinimized, setRecipeMissingIngredientsMinimized, recipeMissingMinPersistError] = useLocalStorage<boolean>(STORAGE_KEYS.RECIPE_MISSING_INGREDIENTS_MINIMIZED, false);
  const [mealPlan, setMealPlan, mealPlanPersistError] = useLocalStorage<MealPlan | null>(STORAGE_KEYS.MEAL_PLAN, null);

  // Parse URL params once at mount. Feeds the view/notification initializers
  // below so shared-link routing happens on the first render (no double-render).
  const [initialSharedData] = useState(parseSharedUrlParams);

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(() =>
    initialSharedData.hasInvalidData
      ? { message: t.invalidSharedData || "Invalid shared data. The link may be corrupted.", type: 'error' }
      : null
  );
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Welcome Dialog State
  const [showWelcome, setShowWelcome] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.WELCOME_DISMISSED) !== 'true';
  });

  // Copy-Paste Dialog State
  const [showCopyPasteDialog, setShowCopyPasteDialog] = useState(false);
  const [copyPastePrompt, setCopyPastePrompt] = useState('');

  // Single Recipe View State (initialized from shared-link URL if present)
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(initialSharedData.recipe);
  // Single Shopping List View State (initialized from shared-link URL if present)
  const [viewShoppingList, setViewShoppingList] = useState<Ingredient[] | null>(initialSharedData.shoppingList);

  // Wake Lock for keeping screen on during cooking
  // Note: Auto-activation was removed because Safari/iOS requires explicit user gesture
  // to acquire a wake lock. The button is prominently displayed for users to tap.
  const wakeLock = useWakeLock();

  // Multi-device sync via GitHub Gist (opt-in).
  const sync = useGistSync();

  // Memoized callbacks to prevent unnecessary re-renders
  const handleCloseWelcome = useCallback(() => setShowWelcome(false), []);
  const handleShowHelp = useCallback(() => setShowWelcome(true), []);
  const handleTogglePantryMinimize = useCallback(() => setPantryMinimized(prev => !prev), [setPantryMinimized]);
  const handleToggleSpiceRackMinimize = useCallback(() => setSpiceRackMinimized(prev => !prev), [setSpiceRackMinimized]);
  const handleToggleKitchenAppliancesMinimize = useCallback(() => setKitchenAppliancesMinimized(prev => !prev), [setKitchenAppliancesMinimized]);
  const handleToggleShoppingListMinimize = useCallback(() => setShoppingListMinimized(prev => !prev), [setShoppingListMinimized]);
  const handleToggleRecipeMissingIngredientsMinimize = useCallback(() => setRecipeMissingIngredientsMinimized(prev => !prev), [setRecipeMissingIngredientsMinimized]);

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

  // Storage error notification — deduplicated via ref guard
  const storageErrorShownRef = useRef(false);
  const [shoppingListCheckedPersistError, setShoppingListCheckedPersistError] = useState(false);
  const anyPersistError = storagePersistError || pantryPersistError || spicesPersistError ||
    appliancesPersistError || headerMinPersistError || optionsMinPersistError || pantryMinPersistError ||
    spiceRackMinPersistError || kitchenAppliancesMinPersistError || shoppingListMinPersistError ||
    recipeMissingMinPersistError || mealPlanPersistError || shoppingListCheckedPersistError;

  useEffect(() => {
    if (anyPersistError && !storageErrorShownRef.current) {
      showNotification({ message: t.storageError, type: 'error' });
      storageErrorShownRef.current = true;
    }
    if (!anyPersistError) {
      storageErrorShownRef.current = false;
    }
  }, [anyPersistError, showNotification, t.storageError]);

  // Notify on successful pull from remote (one-shot per pull, ref-guarded like
  // the sync-error and storage-error effects)
  const pullNotificationShownRef = useRef(false);
  useEffect(() => {
    if (!sync.justPulledFromRemote) {
      pullNotificationShownRef.current = false;
      return;
    }
    if (pullNotificationShownRef.current) return;
    pullNotificationShownRef.current = true;

    showNotification({ message: t.sync.pulledNotification, type: 'undo', timeout: 3000 });
    sync.acknowledgePull();
  }, [sync, showNotification, t.sync.pulledNotification]);

  // Surface sync errors to the user (category-specific message, one-shot per error state change)
  const syncErrorShownRef = useRef<string | null>(null);
  useEffect(() => {
    if (sync.status !== 'error' || sync.errorKind === null) {
      syncErrorShownRef.current = null;
      return;
    }
    if (syncErrorShownRef.current === sync.errorKind) return;
    syncErrorShownRef.current = sync.errorKind;

    const message = {
      unauthorized: t.sync.errorUnauthorized,
      notFound: t.sync.errorNotFound,
      payload: t.sync.errorPayload,
      network: t.sync.errorNetwork,
    }[sync.errorKind];
    showNotification({ message, type: 'error' });
  }, [sync.status, sync.errorKind, showNotification, t.sync.errorUnauthorized, t.sync.errorNotFound, t.sync.errorPayload, t.sync.errorNetwork]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  // Scroll management for standalone view transitions (recipe or shopping list)
  useEffect(() => {
    const isSingleView = viewRecipe !== null || viewShoppingList !== null;
    const wasSingleView = prevViewRecipeRef.current !== null || prevViewShoppingListRef.current !== null;

    if (isSingleView) {
      // Entering a standalone view - scroll to top
      window.scrollTo(0, 0);
    } else if (wasSingleView) {
      // Returning to overview - restore saved position
      window.scrollTo(0, savedScrollPositionRef.current);
    }
    prevViewRecipeRef.current = viewRecipe;
    prevViewShoppingListRef.current = viewShoppingList;
  }, [viewRecipe, viewShoppingList]);

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
    savedScrollPositionRef.current = window.scrollY;
    setViewRecipe(recipe);
    // Update URL without reload
    const shareUrl = generateShareUrl(URL_PARAMS.RECIPE, recipe);
    window.history.pushState({}, '', shareUrl);
  }, []);

  const openShoppingListView = useCallback((items: Ingredient[]) => {
    savedScrollPositionRef.current = window.scrollY;
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

  const addPantryItem = useCallback((v: PantryItem) => {
    setPantryItems(prev => [...prev, v]);
  }, [setPantryItems]);

  const removePantryItem = useCallback((id: string) => {
    setPantryItems(prev => prev.filter(v => v.id !== id));
  }, [setPantryItems]);

  const updatePantryItem = useCallback((id: string, newAmount: string) => {
    setPantryItems(prev => prev.map(item =>
      item.id === id ? { ...item, amount: newAmount } : item
    ));
  }, [setPantryItems]);

  const emptyPantry = useCallback(() => {
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
  }, [pantryItems, setPantryItems, showNotification, clearNotification, t.undo.pantryEmptied, t.undo.action]);

  const addSpice = useCallback((spice: string) => {
    setSpices(prev => {
      if (prev.includes(spice)) return prev;
      return [...prev, spice].sort((a, b) => a.localeCompare(b));
    });
  }, [setSpices]);

  const removeSpice = useCallback((spiceToRemove: string) => {
    setSpices(prev => prev.filter(s => s !== spiceToRemove));
  }, [setSpices]);

  const addAppliance = useCallback((appliance: string) => {
    setAppliances(prev => {
      if (prev.some(a => a.toLowerCase() === appliance.toLowerCase())) return prev;
      return [...prev, appliance].sort((a, b) => a.localeCompare(b));
    });
  }, [setAppliances]);

  const removeAppliance = useCallback((applianceToRemove: string) => {
    setAppliances(prev => prev.filter(a => a !== applianceToRemove));
  }, [setAppliances]);

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

  const handleGenerate = useCallback(async () => {
    // Flush any pending input from PantryInput, StyleWish, SpiceRack or KitchenAppliances before generating
    const pendingItem = pantryInputRef.current?.flushPendingInput();
    const pendingStyleWish = settingsPanelRef.current?.flushPendingInput();
    const pendingSpice = spiceRackRef.current?.flushPendingInput();
    const pendingAppliance = kitchenAppliancesRef.current?.flushPendingInput();

    // If there was a pending item, include it in the pantry, style wishes, spicerack or appliances for generation
    const itemsToUse = pendingItem ? [...pantryItems, pendingItem] : pantryItems;
    const styleWishesToUse = pendingStyleWish ? [...styleWishes, pendingStyleWish] : styleWishes;
    const spicesToUse = pendingSpice ? [...spices, pendingSpice] : spices;
    const appliancesToUse = pendingAppliance ? [...appliances, pendingAppliance] : appliances;

    // Handle copy-paste mode differently
    if (useCopyPaste) {
      const prompt = buildRecipePrompt({
        ingredients: itemsToUse,
        people,
        meals,
        diet,
        language,
        spices: spicesToUse,
        appliances: appliancesToUse,
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
      const plan = await generateRecipes(apiKey, itemsToUse, people, meals, diet, language, spicesToUse, appliancesToUse, styleWishesToUse, t.errors);
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
  }, [pantryItems, spices, appliances, styleWishes, useCopyPaste, apiKey, people, meals, diet, language, t, setCopyPastePrompt, setShowCopyPasteDialog, showNotification, clearNotification, setMealPlan]);

  const handleCopyPasteSubmit = useCallback((response: string) => {
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
  }, [t.errors, t.parseError, setMealPlan, clearNotification, showNotification, setShowCopyPasteDialog]);

  const handleCopyPasteCancel = useCallback(() => {
    setShowCopyPasteDialog(false);
  }, [setShowCopyPasteDialog]);


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
        syncStatus={sync.status}
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

            <KitchenAppliances
              ref={kitchenAppliancesRef}
              appliances={appliances}
              onAddAppliance={addAppliance}
              onRemoveAppliance={removeAppliance}
              isMinimized={kitchenAppliancesMinimized}
              onToggleMinimize={handleToggleKitchenAppliancesMinimize}
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
                  onPersistErrorChange={setShoppingListCheckedPersistError}
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
