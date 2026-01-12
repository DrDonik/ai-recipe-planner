
import { useState, useEffect } from 'react';
import { Sparkles, Users, Key, Utensils, Globe, Salad, Info, ChevronUp, ChevronDown, ChefHat, Refrigerator } from 'lucide-react';
import { PantryInput } from './components/PantryInput';
import { RecipeCard } from './components/RecipeCard';
import { SpiceRack } from './components/SpiceRack';
import { ShoppingList } from './components/ShoppingList';
import { generateRecipes } from './services/llm';
import type { PantryItem, MealPlan, Recipe, Ingredient } from './services/llm';
import { translations } from './constants/translations';

function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');

  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  const [people, setPeople] = useState(() => {
    const saved = localStorage.getItem('people_count');
    return saved ? parseInt(saved, 10) : 2;
  });

  const [meals, setMeals] = useState(() => {
    const saved = localStorage.getItem('meals_count');
    return saved ? parseInt(saved, 10) : 4;
  });

  const [diet, setDiet] = useState(() => {
    return localStorage.getItem('diet_preference') || 'Mostly Vegetarian';
  });

  const [styleWishes, setStyleWishes] = useState(() => {
    return localStorage.getItem('style_wishes') || '';
  });

  const [language, setLanguage] = useState('German');
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);

  // Spice Rack State with Persistence
  const [spices, setSpices] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('spice_rack_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('spice_rack_items', JSON.stringify(spices));
  }, [spices]);

  useEffect(() => {
    localStorage.setItem('people_count', people.toString());
  }, [people]);

  useEffect(() => {
    localStorage.setItem('meals_count', meals.toString());
  }, [meals]);

  useEffect(() => {
    localStorage.setItem('diet_preference', diet);
  }, [diet]);

  useEffect(() => {
    localStorage.setItem('style_wishes', styleWishes);
  }, [styleWishes]);

  const [headerMinimized, setHeaderMinimized] = useState(() => {
    const saved = localStorage.getItem('header_minimized');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('header_minimized', headerMinimized.toString());
  }, [headerMinimized]);

  const [optionsMinimized, setOptionsMinimized] = useState(() => {
    const saved = localStorage.getItem('options_minimized');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('options_minimized', optionsMinimized.toString());
  }, [optionsMinimized]);

  const [spiceRackMinimized, setSpiceRackMinimized] = useState(() => {
    const saved = localStorage.getItem('spice_rack_minimized');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('spice_rack_minimized', spiceRackMinimized.toString());
  }, [spiceRackMinimized]);


  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const t = translations[language as keyof typeof translations];

  // Single Recipe View State
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);
  // Single Shopping List View State
  const [viewShoppingList, setViewShoppingList] = useState<Ingredient[] | null>(null);
  // Single Pantry View State
  const [viewPantry, setViewPantry] = useState<PantryItem[] | null>(null);

  useEffect(() => {
    // Parse URL for shared recipe, shopping list, or pantry
    const searchParams = new URLSearchParams(window.location.search);
    const recipeParam = searchParams.get('recipe');
    const shoppingListParam = searchParams.get('shoppingList');
    const pantryParam = searchParams.get('pantry');

    if (recipeParam) {
      try {
        const json = decodeURIComponent(escape(atob(recipeParam)));
        const recipe = JSON.parse(json);
        setViewRecipe(recipe);
      } catch (err) {
        console.error("Failed to parse shared recipe", err);
      }
    } else if (shoppingListParam) {
      try {
        const json = decodeURIComponent(escape(atob(shoppingListParam)));
        const shoppingList = JSON.parse(json);
        setViewShoppingList(shoppingList);
      } catch (err) {
        console.error("Failed to parse shared shopping list", err);
      }
    } else if (pantryParam) {
      try {
        const json = decodeURIComponent(escape(atob(pantryParam)));
        const pantry = JSON.parse(json);
        setViewPantry(pantry);
      } catch (err) {
        console.error("Failed to parse shared pantry", err);
      }
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
    } else if (viewPantry) {
      const title = `${t.pantry} | AI Recipe Planner`;
      const description = 'Shared pantry inventory from AI Recipe Planner';
      const url = window.location.href;
      updateMetaTags(title, description, url);
    } else {
      const title = 'AI Recipe Planner';
      const description = 'Turn your pantry into delicious meal plans with AI';
      const url = window.location.origin + window.location.pathname;
      updateMetaTags(title, description, url);
    }
  }, [viewRecipe, viewShoppingList, viewPantry, t.shoppingList, t.pantry]);

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

  const clearViewPantry = () => {
    setViewPantry(null);
    // clean URL
    window.history.pushState({}, '', window.location.pathname);
  };

  const loadPantryItems = () => {
    if (viewPantry) {
      setPantryItems(viewPantry);
      clearViewPantry();
    }
  };

  const addPantryItem = (v: PantryItem) => {
    setPantryItems([...pantryItems, v]);
  };

  const removePantryItem = (id: string) => {
    setPantryItems(pantryItems.filter(v => v.id !== id));
  };

  const addSpice = (spice: string) => {
    if (!spices.includes(spice)) {
      setSpices([...spices, spice]);
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
    if (pantryItems.length === 0) {
      setError(t.veggieError);
      return;
    }

    setLoading(true);
    setError(null);
    setMealPlan(null);

    try {
      const plan = await generateRecipes(apiKey, pantryItems, people, meals, diet, language, spices, styleWishes);
      setMealPlan(plan);
    } catch (err: any) {
      setError(err.message || "Something went wrong generating recipes.");
    } finally {
      setLoading(false);
    }
  };


  if (viewRecipe) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] p-8 flex flex-col items-center justify-center">
        <div className="max-w-2xl w-full">
          <RecipeCard recipe={viewRecipe} index={0} language={language} />
          <button
            onClick={clearViewRecipe}
            className="mt-8 text-[var(--color-primary)] hover:underline flex items-center justify-center gap-2 w-full font-medium"
          >
            ← Back to AI Recipe Planner
          </button>
        </div>
      </div>
    );
  }

  if (viewShoppingList) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] p-8 flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full">
          <ShoppingList items={viewShoppingList} language={language} />
          <button
            onClick={clearViewShoppingList}
            className="mt-8 text-[var(--color-primary)] hover:underline flex items-center justify-center gap-2 w-full font-medium"
          >
            ← Back to AI Recipe Planner
          </button>
        </div>
      </div>
    );
  }

  if (viewPantry) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] p-8 flex flex-col items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="glass-panel p-10">
            <div className="flex items-center gap-3 mb-6">
              <Refrigerator className="text-[var(--color-primary)]" size={32} />
              <h1 className="text-2xl font-bold">{t.sharedPantry || t.pantry}</h1>
            </div>

            <div className="grid grid-cols-1 gap-2 mb-6">
              {viewPantry.map((item) => (
                <div key={item.id} className="glass-card flex flex-row items-center justify-between" style={{ padding: '0.75rem' }}>
                  <div className="flex flex-row items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></div>
                    <span className="font-semibold">{item.name}</span>
                    <span className="text-[var(--color-text-muted)] text-sm bg-white/50 dark:bg-white/10 rounded-md shadow-sm" style={{ padding: '0.25rem 0.75rem' }}>
                      {item.amount}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={loadPantryItems}
              className="btn btn-primary w-full mb-4"
            >
              {t.loadPantry || 'Load these items into my pantry'}
            </button>
          </div>

          <button
            onClick={clearViewPantry}
            className="mt-8 text-[var(--color-primary)] hover:underline flex items-center justify-center gap-2 w-full font-medium"
          >
            ← Back to AI Recipe Planner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className={`glass-panel !py-2 rounded-none border-x-0 border-t-0 sticky top-0 z-50 mb-4 backdrop-blur-xl transition-all duration-300 ${headerMinimized ? '!py-1' : ''}`}>
        <div className="app-container flex flex-col items-center py-1">
          <div className="flex flex-col items-start gap-3 relative w-max ml-12 sm:ml-0">
            {/* Floating Leading Icon - Absolute positioned to stay outside the text alignment flow */}
            <div className={`absolute -left-14 sm:-left-16 top-0.5 p-2 bg-[var(--color-primary)] rounded-xl text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 ${headerMinimized ? 'scale-75' : ''}`}>
              <Utensils className={`transition-all duration-300 ${headerMinimized ? 'w-5 h-5' : 'w-6 h-6 sm:w-7 sm:h-7'}`} />
            </div>

            {/* Title with inline toggle button */}
            <div className="flex items-center gap-3">
              <h1 className={`font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] transition-all duration-300 ${headerMinimized ? 'text-2xl' : 'text-4xl'}`}>
                AI Recipe Planner
              </h1>

              {/* Toggle Button */}
              <div className="tooltip-container">
                <button
                  onClick={() => setHeaderMinimized(!headerMinimized)}
                  className="p-1.5 rounded-lg bg-white/50 dark:bg-black/20 border border-[var(--glass-border)] hover:bg-white/70 dark:hover:bg-black/30 transition-all text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                  aria-label={headerMinimized ? t.headerExpand : t.headerMinimize}
                >
                  {headerMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
                <div className="tooltip-text">
                  {headerMinimized ? t.headerExpand : t.headerMinimize}
                </div>
              </div>
            </div>

            {!headerMinimized && (
              <>
                <p className="text-sm text-[var(--color-text-muted)] animate-in fade-in slide-in-from-top-2 duration-300">Turn your pantry into plans</p>

                <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 p-1.5 rounded-full border border-[var(--glass-border)] animate-in fade-in slide-in-from-top-2 duration-300">
                  <Key size={16} className="ml-2 text-[var(--color-text-muted)]" />
                  <input
                    type="password"
                    placeholder="Paste Gemini API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm w-48 px-2"
                  />
                  <div className="tooltip-container flex items-center mr-2">
                    <button
                      type="button"
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors p-1 rounded-full outline-none focus:text-[var(--color-primary)]"
                      aria-label="API Info"
                    >
                      <Info size={14} />
                    </button>
                    <div className="tooltip-text">
                      {t.apiInfo}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 p-1.5 rounded-full border border-[var(--glass-border)] animate-in fade-in slide-in-from-top-2 duration-300">
                  <Globe size={16} className="ml-2 text-[var(--color-text-muted)]" />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm px-2 cursor-pointer font-medium text-[var(--color-text-main)] w-full"
                  >
                    <option value="German">Deutsch</option>
                    <option value="English">English</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="app-container flex flex-col gap-8">

        {/* Input Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          <div className="lg:col-span-1 space-y-6">
            {/* Preferences Panel */}
            <div className="glass-panel p-10 space-y-2">
              {/* Diet Preference */}
              <div className="flex flex-col items-start gap-3">
                <div className="flex items-center gap-3 justify-between w-full">
                  <div className="flex items-center gap-3">
                    <Utensils className="text-[var(--color-secondary)]" size={24} />
                    <span className="font-semibold">{t.diet}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="tooltip-container">
                      <button
                        onClick={() => setOptionsMinimized(!optionsMinimized)}
                        className="p-1.5 rounded-lg bg-white/50 dark:bg-black/20 border border-[var(--glass-border)] hover:bg-white/70 dark:hover:bg-black/30 transition-all text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                        aria-label={optionsMinimized ? t.optionsExpand : t.optionsMinimize}
                      >
                        {optionsMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </button>
                      <div className="tooltip-text">
                        {optionsMinimized ? t.optionsExpand : t.optionsMinimize}
                      </div>
                    </div>
                  </div>
                </div>
                {!optionsMinimized && (
                  <select
                    value={diet}
                    onChange={(e) => setDiet(e.target.value)}
                    className="bg-white/50 dark:bg-black/20 border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:border-[var(--color-primary)] transition-all cursor-pointer"
                  >
                    <option value="Vegan">{t.dietOptions.vegan}</option>
                    <option value="Vegetarian">{t.dietOptions.vegetarian}</option>
                    <option value="Mostly Vegetarian">{t.dietOptions.mostlyVegetarian}</option>
                    <option value="Pescatarian">{t.dietOptions.pescatarian}</option>
                    <option value="Flexitarian">{t.dietOptions.flexitarian}</option>
                    <option value="Carnivore">{t.dietOptions.carnivore}</option>
                  </select>
                )}
              </div>

              {!optionsMinimized && (
                <>
                  {/* Separator */}
                  <div className="h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />

                  {/* Style, Wishes, etc. */}
                  <div className="flex flex-col items-start gap-3">
                    <div className="flex items-center gap-3">
                      <ChefHat className="text-[var(--color-secondary)]" size={24} />
                      <span className="font-semibold">{t.styleWishes}</span>
                    </div>
                    <input
                      type="text"
                      value={styleWishes}
                      onChange={(e) => setStyleWishes(e.target.value)}
                      placeholder={t.styleWishesPlaceholder}
                      className="bg-white/50 dark:bg-black/20 border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)] transition-all w-full"
                    />
                  </div>

                  {/* Separator */}
                  <div className="h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />

                  {/* People Count */}
                  <div className="flex flex-col items-start gap-3">
                    <div className="flex items-center gap-3">
                      <Users className="text-[var(--color-secondary)]" size={24} />
                      <span className="font-semibold">{t.people}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 rounded-lg p-1 w-max">
                      <button
                        onClick={() => setPeople(Math.max(1, people - 1))}
                        className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-gray-50 shadow-sm text-lg font-bold transition-colors text-gray-900"
                      >-</button>
                      <span className="w-8 text-center font-mono font-semibold text-sm">{people}</span>
                      <button
                        onClick={() => setPeople(people + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-gray-50 shadow-sm text-lg font-bold transition-colors text-gray-900"
                      >+</button>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />

                  {/* Meals Count */}
                  <div className="flex flex-col items-start gap-3">
                    <div className="flex items-center gap-3">
                      <Salad className="text-[var(--color-secondary)]" size={24} />
                      <span className="font-semibold">{t.meals}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 rounded-lg p-1 w-max">
                      <button
                        onClick={() => setMeals(Math.max(1, meals - 1))}
                        className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-gray-50 shadow-sm text-lg font-bold transition-colors text-gray-900"
                      >-</button>
                      <span className="w-8 text-center font-mono font-semibold text-sm">{meals}</span>
                      <button
                        onClick={() => setMeals(meals + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-gray-50 shadow-sm text-lg font-bold transition-colors text-gray-900"
                      >+</button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`btn btn-primary w-full py-4 text-lg rounded-xl shadow-lg shadow-[var(--color-primary)]/20 ${loading ? 'opacity-80 cursor-wait' : ''}`}
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                  {t.planning}
                </>
              ) : (
                <>
                  <Sparkles size={20} /> {t.generate}
                </>
              )}
            </button>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <PantryInput
              pantryItems={pantryItems}
              onAddPantryItem={addPantryItem}
              onRemovePantryItem={removePantryItem}
              language={language}
            />

            <SpiceRack
              spices={spices}
              onAddSpice={addSpice}
              onRemoveSpice={removeSpice}
              language={language}
              isMinimized={spiceRackMinimized}
              onToggleMinimize={() => setSpiceRackMinimized(!spiceRackMinimized)}
            />
          </div>

          <div className="lg:col-span-2 space-y-8">
            {mealPlan ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ShoppingList items={mealPlan.shoppingList} language={language} />

                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-transparent bg-clip-text">
                      {t.menuTitle}
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {mealPlan.recipes.map((recipe, index) => (
                      <RecipeCard key={recipe.id} recipe={recipe} index={index} language={language} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center text-[var(--color-text-muted)] p-8 border-2 border-dashed border-[var(--glass-border)] rounded-[var(--radius-xl)] bg-white/20">
                <div className="bg-white/40 p-6 rounded-full mb-4">
                  <Sparkles size={48} className="text-[var(--color-primary)]/50" />
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
