
import { useState } from 'react';
import { Sparkles, Users, Key, Utensils } from 'lucide-react';
import { PantryInput } from './components/PantryInput';
import { RecipeCard } from './components/RecipeCard';
import { ShoppingList } from './components/ShoppingList';
import { generateRecipes } from './services/llm';
import type { Vegetable, MealPlan } from './services/llm';

function App() {
  const [apiKey, setApiKey] = useState('');
  const [people, setPeople] = useState(2);
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addVegetable = (v: Vegetable) => {
    setVegetables([...vegetables, v]);
  };

  const removeVegetable = (id: string) => {
    setVegetables(vegetables.filter(v => v.id !== id));
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      setError("Please enter a valid API Key.");
      return;
    }
    if (vegetables.length === 0) {
      setError("Please add at least one vegetable to your pantry.");
      return;
    }

    setLoading(true);
    setError(null);
    setMealPlan(null);

    try {
      const plan = await generateRecipes(apiKey, vegetables, people);
      setMealPlan(plan);
    } catch (err: any) {
      setError(err.message || "Something went wrong generating recipes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="glass-panel rounded-none border-x-0 border-t-0 sticky top-0 z-50 mb-8 backdrop-blur-xl">
        <div className="container flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--color-primary)] rounded-xl text-white shadow-lg shadow-emerald-500/30">
              <Utensils size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]">
                Veggie Planner
              </h1>
              <p className="text-sm text-[var(--color-text-muted)]">Turn your pantry into plans</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 p-1.5 rounded-full border border-[var(--glass-border)]">
            <Key size={16} className="ml-2 text-[var(--color-text-muted)]" />
            <input
              type="password"
              placeholder="Paste Gemini/OpenAI Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-48 px-2"
            />
          </div>
        </div>
      </header>

      <main className="container flex flex-col gap-8">

        {/* Input Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 space-y-6">
            {/* People Count */}
            <div className="glass-panel p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="text-[var(--color-secondary)]" size={24} />
                <span className="font-semibold">People to feed</span>
              </div>
              <div className="flex items-center gap-3 bg-white/50 dark:bg-black/20 rounded-lg p-1">
                <button
                  onClick={() => setPeople(Math.max(1, people - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-gray-50 shadow-sm text-lg font-bold transition-colors"
                >-</button>
                <span className="w-6 text-center font-mono font-semibold">{people}</span>
                <button
                  onClick={() => setPeople(people + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-gray-50 shadow-sm text-lg font-bold transition-colors"
                >+</button>
              </div>
            </div>

            <PantryInput
              vegetables={vegetables}
              onAddVegetable={addVegetable}
              onRemoveVegetable={removeVegetable}
            />

            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`btn btn-primary w-full py-4 text-lg rounded-xl shadow-lg shadow-[var(--color-primary)]/20 ${loading ? 'opacity-80 cursor-wait' : ''}`}
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                  Planning Meals...
                </>
              ) : (
                <>
                  <Sparkles size={20} /> Generate Meal Plan
                </>
              )}
            </button>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-8">
            {mealPlan ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ShoppingList items={mealPlan.shoppingList} />

                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-transparent bg-clip-text">
                      Your Personalized Menu
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {mealPlan.recipes.map((recipe, index) => (
                      <RecipeCard key={recipe.id} recipe={recipe} index={index} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center text-[var(--color-text-muted)] p-8 border-2 border-dashed border-[var(--glass-border)] rounded-[var(--radius-xl)] bg-white/20">
                <div className="bg-white/40 p-6 rounded-full mb-4">
                  <Sparkles size={48} className="text-[var(--color-primary)]/50" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Ready to plan?</h3>
                <p className="max-w-md">Add your veggies, set the number of people, and let AI design a perfect minimal-waste menu for you.</p>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;
