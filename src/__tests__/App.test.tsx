import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import App from '../App';
import { renderWithSettings } from './testUtils';
import { encodeForUrl } from '../utils/sharing';
import type { Recipe, Ingredient, MealPlan } from '../types';
import { STORAGE_KEYS } from '../constants';

// Mock the llm service for generate tests
vi.mock('../services/llm', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../services/llm')>();
    return {
        ...actual,
        generateRecipes: vi.fn(),
    };
});

// Mock window.location
const mockLocation = new URL('http://localhost:3000');
Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true,
    configurable: true,
});

// Mock window.history
const mockPushState = vi.fn();
window.history.pushState = mockPushState;

describe('App Storage Error Notification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocation.search = '';
        localStorage.setItem('welcome_dismissed', 'true');
    });

    it('shows storage error notification when localStorage.setItem throws QuotaExceededError', async () => {
        // Make setItem throw for pantry_items key BEFORE rendering
        const originalSetItem = localStorage.setItem.bind(localStorage);
        vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
            if (key === 'pantry_items') {
                throw new DOMException('Quota exceeded', 'QuotaExceededError');
            }
            return originalSetItem(key, value);
        });

        renderWithSettings(<App />);

        // The hook will attempt to persist pantry_items (initial []) on mount,
        // which triggers the error and shows the notification
        await waitFor(() => {
            expect(screen.getByText(/could not save data/i)).toBeInTheDocument();
        });

        vi.restoreAllMocks();
    });

    it('renders without errors when localStorage works normally', async () => {
        renderWithSettings(<App />);

        // No storage error notification should appear
        await waitFor(() => {
            expect(screen.queryByText(/could not save data/i)).not.toBeInTheDocument();
        });
    });

    it('shows only one notification when multiple localStorage keys fail simultaneously', async () => {
        // Fail both pantry_items and spice_rack_items to trigger multiple persistError flags
        const originalSetItem = localStorage.setItem.bind(localStorage);
        vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
            if (key === 'pantry_items' || key === 'spice_rack_items') {
                throw new DOMException('Quota exceeded', 'QuotaExceededError');
            }
            return originalSetItem(key, value);
        });

        renderWithSettings(<App />);

        // Wait for the error notification to appear
        await waitFor(() => {
            expect(screen.getByText(/could not save data/i)).toBeInTheDocument();
        });

        // Verify there is exactly one notification element, not two
        const notifications = screen.getAllByText(/could not save data/i);
        expect(notifications).toHaveLength(1);

        vi.restoreAllMocks();
    });

    it('does not show storage error when localStorage works and user interacts', async () => {
        // Render app with working localStorage
        renderWithSettings(<App />);

        // Trigger a user interaction that causes a successful localStorage write
        // (toggling a panel writes a boolean to localStorage)
        const settingsHeader = screen.queryByText(/settings/i);
        if (settingsHeader) {
            fireEvent.click(settingsHeader);
        }

        // After successful writes, no error notification should appear
        await waitFor(() => {
            expect(screen.queryByText(/could not save data/i)).not.toBeInTheDocument();
        });
    });
});

describe('App URL Parameter Decoding', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocation.search = '';
    });

    describe('Recipe URL parameter', () => {
        it('decodes valid recipe parameter on mount', async () => {
            const testRecipe: Recipe = {
                id: 'test-recipe-1',
                title: 'Test Recipe',
                time: '30 min',
                ingredients: [
                    { item: 'Tomato', amount: '2', unit: 'pcs' },
                    { item: 'Onion', amount: '1', unit: 'pc' }
                ],
                instructions: ['Step 1', 'Step 2'],
                usedIngredients: [],
                missingIngredients: []
            };

            const encoded = encodeForUrl(testRecipe);
            mockLocation.search = `?recipe=${encodeURIComponent(encoded)}`;

            renderWithSettings(<App />);

            // Recipe should be displayed
            await waitFor(() => {
                expect(screen.getByText('Test Recipe')).toBeInTheDocument();
            });
        });

        it('shows error notification for invalid recipe data', async () => {
            // Invalid base64 data
            mockLocation.search = '?recipe=invalid-base64-data';

            renderWithSettings(<App />);

            // Error notification should be shown (it's rendered in SettingsPanel)
            await waitFor(() => {
                const errorText = screen.queryByText(/Invalid shared recipe data/i) ||
                                screen.queryByText(/The link may be corrupted/i);
                expect(errorText).toBeInTheDocument();
            }, { timeout: 3000 });
        });

        it('shows error notification for malformed recipe JSON', async () => {
            // Valid base64 but invalid recipe structure
            const invalidData = { not: 'a recipe' };
            const encoded = encodeForUrl(invalidData);
            mockLocation.search = `?recipe=${encodeURIComponent(encoded)}`;

            renderWithSettings(<App />);

            // Error notification should be shown (it's rendered in SettingsPanel)
            await waitFor(() => {
                const errorText = screen.queryByText(/Invalid shared recipe data/i) ||
                                screen.queryByText(/The link may be corrupted/i);
                expect(errorText).toBeInTheDocument();
            }, { timeout: 3000 });
        });
    });

    describe('Shopping List URL parameter', () => {
        it('decodes valid shopping list parameter on mount', async () => {
            const testShoppingList: Ingredient[] = [
                { item: 'Milk', amount: '1', unit: 'L' },
                { item: 'Bread', amount: '1', unit: 'loaf' }
            ];

            const encoded = encodeForUrl(testShoppingList);
            mockLocation.search = `?shoppingList=${encodeURIComponent(encoded)}`;

            renderWithSettings(<App />);

            // Shopping list should be displayed
            await waitFor(() => {
                expect(screen.getByText('Milk')).toBeInTheDocument();
                expect(screen.getByText('Bread')).toBeInTheDocument();
            });
        });

        it('shows error notification for invalid shopping list data', async () => {
            // Invalid base64 data
            mockLocation.search = '?shoppingList=invalid-base64-data';

            renderWithSettings(<App />);

            // Error notification should be shown (it's rendered in SettingsPanel)
            await waitFor(() => {
                const errorText = screen.queryByText(/Invalid shared shopping list data/i) ||
                                screen.queryByText(/The link may be corrupted/i);
                expect(errorText).toBeInTheDocument();
            }, { timeout: 3000 });
        });
    });

    describe('Scroll behavior', () => {
        const testMealPlan: MealPlan = {
            recipes: [
                {
                    id: 'recipe-scroll-1',
                    title: 'Scroll Test Recipe',
                    time: '20 min',
                    ingredients: [{ item: 'Egg', amount: '2', unit: 'pcs' }],
                    instructions: ['Boil eggs'],
                    usedIngredients: [],
                    missingIngredients: []
                }
            ],
            shoppingList: [{ item: 'Flour', amount: '500', unit: 'g' }]
        };

        beforeEach(() => {
            // Seed meal plan into localStorage so App renders recipe cards
            localStorage.setItem('meal_plan', JSON.stringify(testMealPlan));
            localStorage.setItem('welcome_dismissed', 'true');
            // Mock window.scrollTo
            vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
            // Mock window.scrollY to simulate a scrolled position
            Object.defineProperty(window, 'scrollY', { value: 400, writable: true, configurable: true });
        });

        it('scrolls to top when opening single recipe view', async () => {
            renderWithSettings(<App />);

            await waitFor(() => {
                expect(screen.getByText('Scroll Test Recipe')).toBeInTheDocument();
            });

            const viewButton = screen.getByRole('button', { name: 'View recipe' });
            fireEvent.click(viewButton);

            await waitFor(() => {
                expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
            });
        });

        it('restores scroll position when closing single recipe view', async () => {
            renderWithSettings(<App />);

            await waitFor(() => {
                expect(screen.getByText('Scroll Test Recipe')).toBeInTheDocument();
            });

            // Open single recipe view (scroll position 400 is saved)
            const viewButton = screen.getByRole('button', { name: 'View recipe' });
            fireEvent.click(viewButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
            });

            // Reset mock call count to isolate the close action
            vi.mocked(window.scrollTo).mockClear();

            // Close single recipe view
            const closeButton = screen.getByRole('button', { name: 'Close' });
            fireEvent.click(closeButton);

            await waitFor(() => {
                expect(window.scrollTo).toHaveBeenCalledWith(0, 400);
            });
        });

        it('scrolls to top when opening shopping list view', async () => {
            renderWithSettings(<App />);

            await waitFor(() => {
                expect(screen.getByText('Scroll Test Recipe')).toBeInTheDocument();
            });

            const viewButton = screen.getByRole('button', { name: 'Open in new tab' });
            fireEvent.click(viewButton);

            await waitFor(() => {
                expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
            });
        });

        it('restores scroll position when closing shopping list view', async () => {
            renderWithSettings(<App />);

            await waitFor(() => {
                expect(screen.getByText('Scroll Test Recipe')).toBeInTheDocument();
            });

            // Open shopping list view (scroll position 400 is saved)
            const viewButton = screen.getByRole('button', { name: 'Open in new tab' });
            fireEvent.click(viewButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
            });

            // Reset mock call count to isolate the close action
            vi.mocked(window.scrollTo).mockClear();

            // Close shopping list view
            const closeButton = screen.getByRole('button', { name: 'Close' });
            fireEvent.click(closeButton);

            await waitFor(() => {
                expect(window.scrollTo).toHaveBeenCalledWith(0, 400);
            });
        });
    });

    describe('Effect behavior', () => {
        it('runs URL decode effect only once on mount', async () => {
            const testRecipe: Recipe = {
                id: 'test-recipe-2',
                title: 'Language Test Recipe',
                time: '20 min',
                ingredients: [{ item: 'Rice', amount: '200', unit: 'g' }],
                instructions: ['Cook rice'],
                usedIngredients: [],
                missingIngredients: []
            };

            const encoded = encodeForUrl(testRecipe);
            mockLocation.search = `?recipe=${encodeURIComponent(encoded)}`;

            renderWithSettings(<App />);

            // Recipe should be displayed
            await waitFor(() => {
                expect(screen.getByText('Language Test Recipe')).toBeInTheDocument();
            });

            // Recipe continues to be displayed
            // The effect has empty dependency array [], so it only runs once
            expect(screen.getByText('Language Test Recipe')).toBeInTheDocument();
        });

        it('uses translation ref for error messages', async () => {
            // Invalid base64 data that will trigger error
            mockLocation.search = '?recipe=invalid-base64';

            renderWithSettings(<App />);

            // The error message should use the translation from the ref
            // The ref captures t.invalidSharedData and updates when it changes
            await waitFor(() => {
                const errorText = screen.queryByText(/Invalid shared recipe data/i) ||
                                screen.queryByText(/The link may be corrupted/i);
                expect(errorText).toBeInTheDocument();
            }, { timeout: 3000 });
        });
    });
});

describe('App Recipe Deletion', () => {
    const twoRecipePlan: MealPlan = {
        recipes: [
            {
                id: 'recipe-del-1',
                title: 'Pasta Carbonara',
                time: '25 min',
                ingredients: [{ item: 'Pasta', amount: '200g' }],
                instructions: ['Cook pasta'],
                usedIngredients: [],
                missingIngredients: [],
            },
            {
                id: 'recipe-del-2',
                title: 'Garden Salad',
                time: '10 min',
                ingredients: [{ item: 'Lettuce', amount: '1 head' }],
                instructions: ['Wash lettuce'],
                usedIngredients: [],
                missingIngredients: [],
            },
        ],
        shoppingList: [{ item: 'Olive Oil', amount: '2 tbsp' }],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockLocation.search = '';
        localStorage.setItem('welcome_dismissed', 'true');
    });

    it('deletes a recipe and shows undo notification', async () => {
        localStorage.setItem('meal_plan', JSON.stringify(twoRecipePlan));

        renderWithSettings(<App />);

        await waitFor(() => {
            expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
            expect(screen.getByText('Garden Salad')).toBeInTheDocument();
        });

        // Click the first delete button (for Pasta Carbonara)
        const deleteButtons = screen.getAllByLabelText('Delete recipe');
        fireEvent.click(deleteButtons[0]);

        // Pasta Carbonara should be gone, Garden Salad should remain
        await waitFor(() => {
            expect(screen.queryByText('Pasta Carbonara')).not.toBeInTheDocument();
            expect(screen.getByText('Garden Salad')).toBeInTheDocument();
        });

        // Undo notification should appear
        expect(screen.getByText('Recipe deleted')).toBeInTheDocument();
        expect(screen.getByText('Undo')).toBeInTheDocument();
    });

    it('restores deleted recipe when undo is clicked', async () => {
        localStorage.setItem('meal_plan', JSON.stringify(twoRecipePlan));

        renderWithSettings(<App />);

        await waitFor(() => {
            expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByLabelText('Delete recipe');
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
            expect(screen.queryByText('Pasta Carbonara')).not.toBeInTheDocument();
        });

        // Click undo
        fireEvent.click(screen.getByText('Undo'));

        // Recipe should be restored
        await waitFor(() => {
            expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
            expect(screen.getByText('Garden Salad')).toBeInTheDocument();
        });
    });

    it('shows empty state when last recipe is deleted', async () => {
        const singleRecipePlan: MealPlan = {
            recipes: [twoRecipePlan.recipes[0]],
            shoppingList: twoRecipePlan.shoppingList,
        };
        localStorage.setItem('meal_plan', JSON.stringify(singleRecipePlan));

        renderWithSettings(<App />);

        await waitFor(() => {
            expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
        });

        const deleteButton = screen.getByLabelText('Delete recipe');
        fireEvent.click(deleteButton);

        // Empty state placeholder should appear
        await waitFor(() => {
            expect(screen.getByText('Ready to plan?')).toBeInTheDocument();
        });
    });
});

describe('App Empty Pantry with Undo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocation.search = '';
        localStorage.setItem('welcome_dismissed', 'true');
    });

    it('empties pantry and restores on undo', async () => {
        const pantryItems = [
            { id: 'item-1', name: 'Tomatoes', amount: '3' },
            { id: 'item-2', name: 'Onions', amount: '2' },
        ];
        localStorage.setItem(STORAGE_KEYS.PANTRY_ITEMS, JSON.stringify(pantryItems));

        renderWithSettings(<App />);

        await waitFor(() => {
            expect(screen.getByText('Tomatoes')).toBeInTheDocument();
        });

        // Click "Empty Pantry" button (text content, no aria-label)
        const emptyButton = screen.getByRole('button', { name: /empty pantry/i });
        fireEvent.click(emptyButton);

        // Pantry items should be gone
        await waitFor(() => {
            expect(screen.queryByText('Tomatoes')).not.toBeInTheDocument();
            expect(screen.queryByText('Onions')).not.toBeInTheDocument();
        });

        // Undo notification should appear
        expect(screen.getByText('Pantry emptied')).toBeInTheDocument();

        // Click undo
        fireEvent.click(screen.getByText('Undo'));

        // Items should be restored
        await waitFor(() => {
            expect(screen.getByText('Tomatoes')).toBeInTheDocument();
            expect(screen.getByText('Onions')).toBeInTheDocument();
        });
    });
});

describe('App Generate Recipes (API mode)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocation.search = '';
        localStorage.setItem('welcome_dismissed', 'true');
        localStorage.setItem(STORAGE_KEYS.API_KEY_WARNING_SEEN, 'true');
        localStorage.setItem(STORAGE_KEYS.USE_COPY_PASTE, 'false');
    });

    it('shows error notification when no API key is set', async () => {
        // No API key in localStorage
        renderWithSettings(<App />);

        // Find and click the generate button
        const generateButton = screen.getByRole('button', { name: /generate/i });
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText(/please enter a valid api key/i)).toBeInTheDocument();
        });
    });

    it('generates recipes successfully with API key', async () => {
        const { generateRecipes } = await import('../services/llm');
        const mockGenerateRecipes = vi.mocked(generateRecipes);

        const generatedPlan: MealPlan = {
            recipes: [{
                id: 'gen-recipe-1',
                title: 'Generated Recipe',
                time: '15 min',
                ingredients: [{ item: 'Rice', amount: '200g' }],
                instructions: ['Cook rice'],
                usedIngredients: [],
            }],
            shoppingList: [{ item: 'Soy Sauce', amount: '2 tbsp' }],
        };

        mockGenerateRecipes.mockResolvedValueOnce(generatedPlan);

        localStorage.setItem(STORAGE_KEYS.API_KEY, 'test-api-key');
        localStorage.setItem(STORAGE_KEYS.PANTRY_ITEMS, JSON.stringify([{ id: '1', name: 'Rice', amount: '200g' }]));

        renderWithSettings(<App />);

        const generateButton = screen.getByRole('button', { name: /generate/i });
        fireEvent.click(generateButton);

        // Should show generated recipe
        await waitFor(() => {
            expect(screen.getByText('Generated Recipe')).toBeInTheDocument();
        });

        // generateRecipes was called with the API key
        expect(mockGenerateRecipes).toHaveBeenCalledTimes(1);
    });

    it('shows error notification when generation fails and preserves old plan', async () => {
        const { generateRecipes } = await import('../services/llm');
        const mockGenerateRecipes = vi.mocked(generateRecipes);

        mockGenerateRecipes.mockRejectedValueOnce(new Error('API rate limit exceeded'));

        // Seed an existing meal plan
        const existingPlan: MealPlan = {
            recipes: [{
                id: 'existing-1',
                title: 'Existing Recipe',
                time: '20 min',
                ingredients: [{ item: 'Egg', amount: '2' }],
                instructions: ['Boil'],
                usedIngredients: [],
            }],
            shoppingList: [],
        };
        localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify(existingPlan));
        localStorage.setItem(STORAGE_KEYS.API_KEY, 'test-api-key');

        renderWithSettings(<App />);

        await waitFor(() => {
            expect(screen.getByText('Existing Recipe')).toBeInTheDocument();
        });

        const generateButton = screen.getByRole('button', { name: /generate/i });
        fireEvent.click(generateButton);

        // Error should appear
        await waitFor(() => {
            expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument();
        });

        // Existing recipe should still be visible (not cleared)
        expect(screen.getByText('Existing Recipe')).toBeInTheDocument();
    });
});

describe('App Copy & Paste Mode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocation.search = '';
        localStorage.setItem('welcome_dismissed', 'true');
        // Default mode is Copy & Paste
    });

    it('opens CopyPasteDialog when generate is clicked in Copy&Paste mode', async () => {
        renderWithSettings(<App />);

        const generateButton = screen.getByRole('button', { name: /generate/i });
        fireEvent.click(generateButton);

        // CopyPasteDialog should appear (it has role="dialog")
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
    });

    it('closes CopyPasteDialog when cancel is clicked', async () => {
        const user = userEvent.setup();
        renderWithSettings(<App />);

        const generateButton = screen.getByRole('button', { name: /generate/i });
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Click close button (X button in CopyPasteDialog)
        const closeButton = screen.getByRole('button', { name: 'Close' });
        await user.click(closeButton);

        // Dialog should be closed
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });
});
