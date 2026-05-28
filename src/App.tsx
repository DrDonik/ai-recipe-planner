import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { useWakeLock } from './hooks/useWakeLock';
import { useGistSync } from './hooks/useGistSync';
import { useRecipeImage } from './hooks/useRecipeImage';
import { PantryInput, type PantryInputRef } from './components/PantryInput';
import { RecipeCard } from './components/RecipeCard';
import { SpiceRack, type SpiceRackRef } from './components/SpiceRack';
import { KitchenAppliances, type KitchenAppliancesRef } from './components/KitchenAppliances';
import { ShoppingList } from './components/ShoppingList';
import { WelcomeDialog } from './components/WelcomeDialog';
import { CopyPasteDialog } from './components/CopyPasteDialog';
import { ReplaceRecipeDialog } from './components/ReplaceRecipeDialog';
import { generateRecipes, buildRecipePrompt, parseRecipeResponse } from './services/llm';
import type { PantryItem, MealPlan, Recipe, Ingredient, Notification } from './types';
import { useLocalStorage, writeLocalStorageExternal } from './hooks/useLocalStorage';
import { buildMiniPantry, recomputeShoppingList } from './utils/recipeReplacement';
import { generateId } from './utils/idGenerator';
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
  const { useCopyPaste, apiKey, people, meals, diet, styleWishes, language, imageGenEnabled, setImageGenEnabled, t, storagePersistError } = useSettings();

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
  const generateAbortRef = useRef<AbortController | null>(null);
  const userAbortedRef = useRef(false);

  // Welcome Dialog State
  const [showWelcome, setShowWelcome] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.WELCOME_DISMISSED) !== 'true';
  });

  // Copy-Paste Dialog State
  const [showCopyPasteDialog, setShowCopyPasteDialog] = useState(false);
  const [copyPastePrompt, setCopyPastePrompt] = useState('');

  // Single-recipe replacement state. `replaceTarget` doubles as the dialog's
  // open flag; the abort refs mirror the full-generation cancel mechanism.
  const replaceAbortRef = useRef<AbortController | null>(null);
  const replaceUserAbortedRef = useRef(false);
  const [replaceTarget, setReplaceTarget] = useState<Recipe | null>(null);
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [replaceError, setReplaceError] = useState<string | null>(null);

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

  // On-demand recipe image generation, persisted in IndexedDB.
  // Image generation requires a configured API key, direct-API mode (the
  // copy-paste flow has no API call to make), and the user-facing toggle
  // confirming they want to spend money on a paid Gemini tier. Standalone
  // shared-link views (no meal plan loaded) also can't generate, since
  // there's nowhere to persist.
  const recipeIds = useMemo(() => mealPlan?.recipes.map(r => r.id) ?? [], [mealPlan]);
  const handleFreeTierLimit = useCallback(() => {
    setImageGenEnabled(false);
    showNotification({ message: t.errors.imageFreeTierUnsupported, type: 'error', timeout: 5000 });
  }, [setImageGenEnabled, showNotification, t.errors.imageFreeTierUnsupported]);
  const recipeImage = useRecipeImage(recipeIds, { onFreeTierLimit: handleFreeTierLimit });
  const canGenerateImages = !useCopyPaste && !!apiKey && imageGenEnabled;
  // Single-recipe replacement needs a live API call, so it's gated like image
  // generation: direct-API mode with a key (no copy-paste support for now).
  const canReplaceRecipes = !useCopyPaste && !!apiKey;

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

  // Cleanup notification timeout on unmount
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

  const clearShoppingList = useCallback(() => {
    if (!mealPlan) return;
    const backupList = mealPlan.shoppingList;
    const backupCheckedRaw = localStorage.getItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED);
    setMealPlan({ ...mealPlan, shoppingList: [] });
    writeLocalStorageExternal(STORAGE_KEYS.SHOPPING_LIST_CHECKED, undefined);
    showNotification({
      message: t.undo.shoppingListCleared,
      type: 'undo',
      anchor: 'shopping-list',
      action: {
        label: t.undo.action,
        ariaLabel: `${t.undo.action} ${t.undo.shoppingListCleared.toLowerCase()}`,
        onClick: () => {
          setMealPlan(prev => prev ? { ...prev, shoppingList: backupList } : prev);
          if (backupCheckedRaw !== null) {
            try {
              writeLocalStorageExternal(STORAGE_KEYS.SHOPPING_LIST_CHECKED, JSON.parse(backupCheckedRaw));
            } catch {
              // Malformed backup — skip restoring checked state.
            }
          }
          clearNotification();
        }
      },
      timeout: 5000
    });
  }, [mealPlan, setMealPlan, showNotification, clearNotification, t.undo.shoppingListCleared, t.undo.action]);

  const emptyPantry = useCallback(() => {
    const backup = [...pantryItems];
    setPantryItems([]);
    showNotification({
      message: t.undo.pantryEmptied,
      type: 'undo',
      anchor: 'pantry',
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

  // Recipe deletion is deferred so the toast can occupy the card's grid slot
  // for 5s. If the user deletes a second recipe before the timer fires, we
  // commit the previous deletion synchronously to avoid stranding it.
  const [pendingDeleteRecipeId, setPendingDeleteRecipeId] = useState<string | null>(null);
  const pendingDeleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitRecipeDeletion = useCallback((recipeId: string) => {
    setMealPlan(prev => {
      if (!prev) return prev;
      const remaining = prev.recipes.filter(r => r.id !== recipeId);
      return remaining.length === 0 ? null : { ...prev, recipes: remaining };
    });
  }, [setMealPlan]);

  const deleteRecipe = useCallback((recipeId: string) => {
    // Clear any pending delete-timer. If a different recipe was pending, flush
    // it synchronously so it doesn't get stranded.
    if (pendingDeleteTimeoutRef.current) {
      clearTimeout(pendingDeleteTimeoutRef.current);
      if (pendingDeleteRecipeId && pendingDeleteRecipeId !== recipeId) {
        commitRecipeDeletion(pendingDeleteRecipeId);
      }
    }
    setPendingDeleteRecipeId(recipeId);
    pendingDeleteTimeoutRef.current = setTimeout(() => {
      commitRecipeDeletion(recipeId);
      setPendingDeleteRecipeId(null);
      pendingDeleteTimeoutRef.current = null;
    }, 5000);
    showNotification({
      message: t.undo.recipeDeleted,
      type: 'undo',
      anchor: 'recipe',
      anchorId: recipeId,
      action: {
        label: t.undo.action,
        ariaLabel: `${t.undo.action} ${t.undo.recipeDeleted.toLowerCase()}`,
        onClick: () => {
          if (pendingDeleteTimeoutRef.current) {
            clearTimeout(pendingDeleteTimeoutRef.current);
            pendingDeleteTimeoutRef.current = null;
          }
          setPendingDeleteRecipeId(null);
          clearNotification();
        }
      },
      timeout: 5000
    });
  }, [pendingDeleteRecipeId, commitRecipeDeletion, showNotification, clearNotification, t.undo.recipeDeleted, t.undo.action]);

  // After a new plan replaces an existing one, offer a one-tap undo.
  // Restores the prior plan and the shopping-list checkmarks that were cleared.
  const offerMealPlanUndo = useCallback((previousMealPlan: MealPlan | null, previousShoppingChecks: string | null) => {
    if (!previousMealPlan) return;
    showNotification({
      message: t.undo.mealPlanReplaced,
      type: 'undo',
      action: {
        label: t.undo.action,
        ariaLabel: `${t.undo.action} ${t.undo.mealPlanReplaced.toLowerCase()}`,
        onClick: () => {
          setMealPlan(previousMealPlan);
          if (previousShoppingChecks !== null) {
            localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED, previousShoppingChecks);
          } else {
            localStorage.removeItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED);
          }
          clearNotification();
        }
      },
      timeout: 5000
    });
  }, [showNotification, clearNotification, setMealPlan, t.undo.mealPlanReplaced, t.undo.action]);

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
    const previousMealPlan = mealPlan;
    const previousShoppingChecks = localStorage.getItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED);
    const controller = new AbortController();
    generateAbortRef.current = controller;
    userAbortedRef.current = false;

    try {
      const plan = await generateRecipes(apiKey, itemsToUse, people, meals, diet, language, spicesToUse, appliancesToUse, styleWishesToUse, t.errors, controller.signal);
      setMealPlan(plan);
      // Clear shopping list checkmarks when generating a new meal plan (scenario 9)
      localStorage.removeItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED);
      offerMealPlanUndo(previousMealPlan, previousShoppingChecks);
    } catch (err: unknown) {
      // User-initiated cancel: silently revert to ready state, keep previous plan
      if (userAbortedRef.current && err instanceof Error && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : t.generateError;
      showNotification({ message, type: 'error' });
      // Previous meal plan is preserved - user can still see their last successful generation
    } finally {
      generateAbortRef.current = null;
      userAbortedRef.current = false;
      setLoading(false);
    }
  }, [pantryItems, spices, appliances, styleWishes, useCopyPaste, apiKey, people, meals, diet, language, t, setCopyPastePrompt, setShowCopyPasteDialog, showNotification, clearNotification, setMealPlan, mealPlan, offerMealPlanUndo]);

  const handleCancelGenerate = useCallback(() => {
    if (!generateAbortRef.current) return;
    userAbortedRef.current = true;
    generateAbortRef.current.abort();
  }, []);

  const handleCopyPasteSubmit = useCallback((response: string) => {
    setShowCopyPasteDialog(false);
    setLoading(true);
    clearNotification();
    const previousMealPlan = mealPlan;
    const previousShoppingChecks = localStorage.getItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED);

    try {
      const plan = parseRecipeResponse(response, t.errors);
      setMealPlan(plan);
      localStorage.removeItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED);
      offerMealPlanUndo(previousMealPlan, previousShoppingChecks);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.parseError;
      showNotification({ message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t.errors, t.parseError, setMealPlan, clearNotification, showNotification, setShowCopyPasteDialog, mealPlan, offerMealPlanUndo]);

  const handleCopyPasteCancel = useCallback(() => {
    setShowCopyPasteDialog(false);
  }, [setShowCopyPasteDialog]);

  const openReplaceDialog = useCallback((recipe: Recipe) => {
    setReplaceError(null);
    setReplaceTarget(recipe);
  }, []);

  const closeReplaceDialog = useCallback(() => {
    setReplaceTarget(null);
    setReplaceError(null);
  }, []);

  const handleCancelReplace = useCallback(() => {
    if (!replaceAbortRef.current) return;
    replaceUserAbortedRef.current = true;
    replaceAbortRef.current.abort();
  }, []);

  // Regenerate a single recipe in place. The discarded recipe's pantry slice
  // (its used items, with the amounts it actually consumed) becomes the pantry
  // for a 1-meal generation, so the kept recipes' allocations stay valid. The
  // user's preference rides along as a one-off style wish. On success the new
  // recipe takes the same grid slot and the shopping list is recomputed; on
  // failure or cancel the original recipe is left untouched.
  const handleReplaceSubmit = useCallback(async (preference: string) => {
    const target = replaceTarget;
    if (!target || !apiKey) return;

    setReplaceLoading(true);
    setReplaceError(null);
    const controller = new AbortController();
    replaceAbortRef.current = controller;
    replaceUserAbortedRef.current = false;

    const miniPantry = buildMiniPantry(target, pantryItems);
    const trimmed = preference.trim();
    const oneOffWishes = trimmed
      ? [...styleWishes, `Replacing the recipe "${target.title}".`, trimmed]
      : [...styleWishes, `Avoid recipes similar to "${target.title}".`];

    try {
      const plan = await generateRecipes(apiKey, miniPantry, people, 1, diet, language, spices, appliances, oneOffWishes, t.errors, controller.signal);
      const newRecipe = plan.recipes[0];
      if (!newRecipe) throw new Error(t.errors.emptyResponse);
      // Force a fresh unique id so React keys and per-recipe image state can't
      // collide with a recipe the model happened to label identically.
      newRecipe.id = generateId();
      setMealPlan(prev => {
        if (!prev) return prev;
        const idx = prev.recipes.findIndex(r => r.id === target.id);
        if (idx === -1) return prev; // recipe was deleted while regenerating
        const recipes = [...prev.recipes];
        recipes[idx] = newRecipe;
        return { ...prev, recipes, shoppingList: recomputeShoppingList(recipes) };
      });
      setReplaceTarget(null);
    } catch (err: unknown) {
      // User-initiated cancel: dismiss the dialog, keep the old recipe intact.
      if (replaceUserAbortedRef.current && err instanceof Error && err.name === 'AbortError') {
        setReplaceTarget(null);
      } else {
        const message = err instanceof Error ? err.message : t.generateError;
        setReplaceError(message);
      }
    } finally {
      replaceAbortRef.current = null;
      replaceUserAbortedRef.current = false;
      setReplaceLoading(false);
    }
  }, [replaceTarget, apiKey, pantryItems, styleWishes, people, diet, language, spices, appliances, t.errors, t.generateError, setMealPlan]);


  if (viewRecipe) {
    // Allow image generation in standalone view only when the recipe is part
    // of the user's own meal plan — shared-link views have no persistence
    // target and there's no point letting visitors generate into the void.
    const isOwnRecipe = !!mealPlan?.recipes.some(r => r.id === viewRecipe.id);
    const canGenerateForView = canGenerateImages && isOwnRecipe;
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
            onGenerateImage={canGenerateForView ? () => recipeImage.generate(viewRecipe) : undefined}
            onRemoveImage={isOwnRecipe ? () => recipeImage.remove(viewRecipe.id) : undefined}
            isImageLoading={recipeImage.isLoading(viewRecipe.id)}
            imageError={recipeImage.getError(viewRecipe.id)}
            imageUrl={recipeImage.getImageUrl(viewRecipe.id)}
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
      {replaceTarget && (
        <ReplaceRecipeDialog
          recipe={replaceTarget}
          isLoading={replaceLoading}
          error={replaceError}
          onSubmit={handleReplaceSubmit}
          onCancel={closeReplaceDialog}
          onCancelGenerate={handleCancelReplace}
        />
      )}

      <Header
        headerMinimized={headerMinimized}
        setHeaderMinimized={setHeaderMinimized}
        onShowHelp={handleShowHelp}
        onShowNotification={showNotification}
        onClearNotification={clearNotification}
        syncStatus={sync.status}
        notification={notification}
      />

      <main className="app-container flex flex-col gap-8">
        {/* Input Section */}
        <section className="flex flex-col md:flex-row gap-12 md:items-start">
          <div className={`md:flex-1 md:max-w-sm md:min-w-0 space-y-6 relative z-10 ${mealPlan ? 'order-3 md:order-none' : ''}`}>
            <SettingsPanel
              ref={settingsPanelRef}
              optionsMinimized={optionsMinimized}
              setOptionsMinimized={setOptionsMinimized}
              loading={loading}
              handleGenerate={handleGenerate}
              onCancelGenerate={handleCancelGenerate}
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
              notification={notification}
              autoFocus={!mealPlan}
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

          {mealPlan && <hr className="md:hidden order-2 border-t-2 border-primary/30" />}

          <div className={`md:flex-1 md:min-w-0 space-y-8 ${mealPlan ? 'order-1 md:order-none' : 'hidden md:block'}`}>
            {mealPlan ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ShoppingList
                  key={mealPlan.recipes[0]?.id ?? 'shopping-list'}
                  items={mealPlan.shoppingList}
                  isMinimized={shoppingListMinimized}
                  onToggleMinimize={handleToggleShoppingListMinimize}
                  onViewSingle={() => openShoppingListView(mealPlan.shoppingList)}
                  onClear={clearShoppingList}
                  onPersistErrorChange={setShoppingListCheckedPersistError}
                  notification={notification}
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
                        onGenerateImage={canGenerateImages ? () => recipeImage.generate(recipe) : undefined}
                        onReplace={canReplaceRecipes ? () => openReplaceDialog(recipe) : undefined}
                        onRemoveImage={() => recipeImage.remove(recipe.id)}
                        isImageLoading={recipeImage.isLoading(recipe.id)}
                        pendingDelete={pendingDeleteRecipeId === recipe.id}
                        deleteNotification={
                          pendingDeleteRecipeId === recipe.id &&
                          notification?.anchor === 'recipe' &&
                          notification?.anchorId === recipe.id
                            ? notification
                            : null
                        }
                        imageError={recipeImage.getError(recipe.id)}
                        imageUrl={recipeImage.getImageUrl(recipe.id)}
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
