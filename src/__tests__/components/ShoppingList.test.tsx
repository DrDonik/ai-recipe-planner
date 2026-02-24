import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ShoppingList } from '../../components/ShoppingList';
import type { Ingredient, MealPlan } from '../../types';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { STORAGE_KEYS } from '../../constants';

const mockItems: Ingredient[] = [
    { item: 'Tomato', amount: '2' },
    { item: 'Onion', amount: '1' },
    { item: 'Salt', amount: '1 tsp' },
];

const renderWithSettings = (ui: React.ReactElement) => {
    return render(<SettingsProvider>{ui}</SettingsProvider>);
};

describe('ShoppingList', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
    });

    describe('External Link Button (onViewSingle)', () => {
        it('renders external link button when not in standalone view and onViewSingle is provided', () => {
            const onViewSingle = vi.fn();
            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={false}
                    onViewSingle={onViewSingle}
                />
            );

            const button = screen.getByLabelText(/open in new tab/i);
            expect(button).toBeInTheDocument();
        });

        it('does not render external link button when onViewSingle is not provided', () => {
            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={false}
                />
            );

            const button = screen.queryByLabelText(/open in new tab/i);
            expect(button).not.toBeInTheDocument();
        });

        it('does not render external link button in standalone view', () => {
            const onViewSingle = vi.fn();
            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={true}
                    onViewSingle={onViewSingle}
                />
            );

            const button = screen.queryByLabelText(/open in new tab/i);
            expect(button).not.toBeInTheDocument();
        });

        it('calls onViewSingle when external link button is clicked', async () => {
            const user = userEvent.setup();
            const onViewSingle = vi.fn();
            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={false}
                    onViewSingle={onViewSingle}
                />
            );

            const button = screen.getByLabelText(/open in new tab/i);
            await user.click(button);

            expect(onViewSingle).toHaveBeenCalledTimes(1);
        });
    });

    describe('Close Button (onClose)', () => {
        it('renders close button when isStandaloneView and onClose are provided', () => {
            const onClose = vi.fn();
            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={true}
                    onClose={onClose}
                />
            );

            const button = screen.getByLabelText(/close/i);
            expect(button).toBeInTheDocument();
        });

        it('does not render close button when onClose is not provided', () => {
            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={true}
                />
            );

            const button = screen.queryByLabelText(/close/i);
            expect(button).not.toBeInTheDocument();
        });

        it('does not render close button when not in standalone view', () => {
            const onClose = vi.fn();
            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={false}
                    onClose={onClose}
                />
            );

            const button = screen.queryByLabelText(/close/i);
            expect(button).not.toBeInTheDocument();
        });

        it('calls onClose when close button is clicked', async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();
            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={true}
                    onClose={onClose}
                />
            );

            const button = screen.getByLabelText(/close/i);
            await user.click(button);

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Minimize Toggle Button', () => {
        it('renders minimize toggle button when onToggleMinimize is provided', () => {
            const onToggleMinimize = vi.fn();
            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    onToggleMinimize={onToggleMinimize}
                />
            );

            const button = screen.getByLabelText(/collapse/i);
            expect(button).toBeInTheDocument();
        });

        it('does not render minimize toggle button when onToggleMinimize is not provided', () => {
            renderWithSettings(
                <ShoppingList items={mockItems} />
            );

            const button = screen.queryByLabelText(/collapse/i);
            expect(button).not.toBeInTheDocument();
        });

        it('calls onToggleMinimize when toggle button is clicked', async () => {
            const user = userEvent.setup();
            const onToggleMinimize = vi.fn();
            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    onToggleMinimize={onToggleMinimize}
                />
            );

            const button = screen.getByLabelText(/collapse/i);
            await user.click(button);

            expect(onToggleMinimize).toHaveBeenCalledTimes(1);
        });
    });

    describe('Shopping List Content', () => {
        it('renders all shopping items', () => {
            renderWithSettings(
                <ShoppingList items={mockItems} />
            );

            expect(screen.getByText('Tomato')).toBeInTheDocument();
            expect(screen.getByText('Onion')).toBeInTheDocument();
            expect(screen.getByText('Salt')).toBeInTheDocument();
        });

        it('renders item amounts', () => {
            renderWithSettings(
                <ShoppingList items={mockItems} />
            );

            expect(screen.getByText('2')).toBeInTheDocument();
            expect(screen.getByText('1')).toBeInTheDocument();
            expect(screen.getByText('1 tsp')).toBeInTheDocument();
        });

        it('renders checkboxes for each item', () => {
            renderWithSettings(
                <ShoppingList items={mockItems} />
            );

            const checkboxes = screen.getAllByRole('checkbox');
            expect(checkboxes).toHaveLength(3);
        });

        it('toggles checkbox state when clicked', async () => {
            const user = userEvent.setup();
            renderWithSettings(
                <ShoppingList items={mockItems} />
            );

            const checkboxes = screen.getAllByRole('checkbox');
            const firstCheckbox = checkboxes[0];

            expect(firstCheckbox).not.toBeChecked();

            await user.click(firstCheckbox);
            expect(firstCheckbox).toBeChecked();

            await user.click(firstCheckbox);
            expect(firstCheckbox).not.toBeChecked();
        });

        it('toggles item once when clicking the list item text (not checkbox)', async () => {
            const user = userEvent.setup();
            renderWithSettings(
                <ShoppingList items={mockItems} />
            );

            const checkboxes = screen.getAllByRole('checkbox');
            const firstCheckbox = checkboxes[0];
            expect(firstCheckbox).not.toBeChecked();

            // Click the item text (the li onClick handler), not the checkbox
            const itemText = screen.getByText('Tomato');
            await user.click(itemText);

            // Should toggle exactly once (not double-toggle)
            expect(firstCheckbox).toBeChecked();
        });
    });

    describe('Minimized State', () => {
        it('hides shopping items when minimized', () => {
            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isMinimized={true}
                />
            );

            const checkboxes = screen.queryAllByRole('checkbox');
            expect(checkboxes).toHaveLength(0);
        });

        it('shows shopping items when not minimized', () => {
            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isMinimized={false}
                />
            );

            const checkboxes = screen.getAllByRole('checkbox');
            expect(checkboxes).toHaveLength(3);
        });
    });

    describe('Empty List', () => {
        it('renders nothing when items array is empty', () => {
            const { container } = renderWithSettings(
                <ShoppingList items={[]} />
            );

            expect(container).toBeEmptyDOMElement();
        });
    });

    describe('Decoupled List Indicator', () => {
        it('shows decoupled indicator in standalone view when not own list', () => {
            // Don't set a meal plan in localStorage, so it's a shared list
            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={true}
                />
            );

            // The decoupled text should be present
            expect(screen.getByText(/decoupled/i)).toBeInTheDocument();
        });

        it('does not show decoupled indicator in main view', () => {
            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={false}
                />
            );

            const decoupledText = screen.queryByText(/decoupled/i);
            expect(decoupledText).not.toBeInTheDocument();
        });
    });

    describe('Persist Error Callback', () => {
        it('calls onPersistErrorChange with true when localStorage write fails', async () => {
            const onPersistErrorChange = vi.fn();
            const user = userEvent.setup();

            // Spy on the actual localStorage instance (not Storage.prototype,
            // because the test environment uses a custom LocalStorageMock)
            const originalSetItem = localStorage.setItem.bind(localStorage);
            vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
                if (key === STORAGE_KEYS.SHOPPING_LIST_CHECKED) {
                    throw new DOMException('Quota exceeded', 'QuotaExceededError');
                }
                return originalSetItem(key, value);
            });

            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    onPersistErrorChange={onPersistErrorChange}
                />
            );

            // Toggle a checkbox to trigger a localStorage write
            const checkboxes = screen.getAllByRole('checkbox');
            await user.click(checkboxes[0]);

            // onPersistErrorChange should have been called with true
            expect(onPersistErrorChange).toHaveBeenCalledWith(true);

            vi.restoreAllMocks();
        });

        it('calls onPersistErrorChange with false when localStorage write succeeds', async () => {
            const onPersistErrorChange = vi.fn();
            const user = userEvent.setup();

            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    onPersistErrorChange={onPersistErrorChange}
                />
            );

            // Toggle a checkbox — should succeed normally
            const checkboxes = screen.getAllByRole('checkbox');
            await user.click(checkboxes[0]);

            // onPersistErrorChange should have been called with false (no error)
            expect(onPersistErrorChange).toHaveBeenCalledWith(false);
        });

        it('does not crash when onPersistErrorChange is not provided and localStorage fails', async () => {
            const user = userEvent.setup();

            const originalSetItem = localStorage.setItem.bind(localStorage);
            vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
                if (key === STORAGE_KEYS.SHOPPING_LIST_CHECKED) {
                    throw new DOMException('Quota exceeded', 'QuotaExceededError');
                }
                return originalSetItem(key, value);
            });

            // Render WITHOUT onPersistErrorChange prop
            renderWithSettings(
                <ShoppingList items={mockItems} />
            );

            // Toggle a checkbox — should not crash
            const checkboxes = screen.getAllByRole('checkbox');
            await user.click(checkboxes[0]);

            // Component should still be rendered
            expect(screen.getByText('Tomato')).toBeInTheDocument();

            vi.restoreAllMocks();
        });

        it('calls onPersistErrorChange with false after error clears on recovery', async () => {
            const onPersistErrorChange = vi.fn();
            const user = userEvent.setup();

            const originalSetItem = localStorage.setItem.bind(localStorage);
            const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
                if (key === STORAGE_KEYS.SHOPPING_LIST_CHECKED) {
                    throw new DOMException('Quota exceeded', 'QuotaExceededError');
                }
                return originalSetItem(key, value);
            });

            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    onPersistErrorChange={onPersistErrorChange}
                />
            );

            // Trigger a failing write
            const checkboxes = screen.getAllByRole('checkbox');
            await user.click(checkboxes[0]);
            expect(onPersistErrorChange).toHaveBeenCalledWith(true);

            // Restore normal localStorage behavior
            setItemSpy.mockRestore();
            onPersistErrorChange.mockClear();

            // Trigger a successful write — error should clear
            await user.click(checkboxes[0]);
            expect(onPersistErrorChange).toHaveBeenCalledWith(false);
        });
    });

    describe('Own List vs Shared List Detection', () => {
        it('correctly identifies own list when shopping list matches stored meal plan', () => {
            // Set up a meal plan in localStorage with matching shopping list
            const mealPlan: MealPlan = {
                recipes: [],
                shoppingList: mockItems,
            };
            localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify(mealPlan));

            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={true}
                />
            );

            // Should NOT show decoupled indicator for own list
            const decoupledText = screen.queryByText(/decoupled/i);
            expect(decoupledText).not.toBeInTheDocument();
        });

        it('correctly identifies shared list when shopping list does not match stored meal plan', () => {
            // Set up a meal plan with different shopping list
            const differentItems: Ingredient[] = [
                { item: 'Potato', amount: '3' },
                { item: 'Carrot', amount: '2' },
            ];
            const mealPlan: MealPlan = {
                recipes: [],
                shoppingList: differentItems,
            };
            localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify(mealPlan));

            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={true}
                />
            );

            // Should show decoupled indicator for shared list
            expect(screen.getByText(/decoupled/i)).toBeInTheDocument();
        });

        it('initializes checked state from main localStorage for own list', () => {
            // Set up meal plan matching the items
            const mealPlan: MealPlan = {
                recipes: [],
                shoppingList: mockItems,
            };
            localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify(mealPlan));

            // Set checked state for the first item
            const checkedKeys = ['Tomato|2'];
            localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED, JSON.stringify(checkedKeys));

            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={true}
                />
            );

            const checkboxes = screen.getAllByRole('checkbox');
            // First checkbox should be checked (from localStorage)
            expect(checkboxes[0]).toBeChecked();
            // Others should not be checked
            expect(checkboxes[1]).not.toBeChecked();
            expect(checkboxes[2]).not.toBeChecked();
        });

        it('initializes own list with no checked items when localStorage has no checked state', () => {
            // Set up meal plan matching the items
            const mealPlan: MealPlan = {
                recipes: [],
                shoppingList: mockItems,
            };
            localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify(mealPlan));

            // Do NOT set SHOPPING_LIST_CHECKED - simulating first time user views their list

            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={true}
                />
            );

            const checkboxes = screen.getAllByRole('checkbox');
            // All checkboxes should be unchecked
            expect(checkboxes[0]).not.toBeChecked();
            expect(checkboxes[1]).not.toBeChecked();
            expect(checkboxes[2]).not.toBeChecked();

            // Should NOT show decoupled indicator (this is own list, not shared)
            const decoupledText = screen.queryByText(/decoupled/i);
            expect(decoupledText).not.toBeInTheDocument();
        });

        it('gracefully handles corrupted checked state JSON for own list', () => {
            // Set up meal plan matching the items
            const mealPlan: MealPlan = {
                recipes: [],
                shoppingList: mockItems,
            };
            localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify(mealPlan));

            // Set corrupted JSON in SHOPPING_LIST_CHECKED
            localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED, 'not-valid-json');

            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={true}
                />
            );

            const checkboxes = screen.getAllByRole('checkbox');
            // All checkboxes should be unchecked (graceful fallback)
            expect(checkboxes[0]).not.toBeChecked();
            expect(checkboxes[1]).not.toBeChecked();
            expect(checkboxes[2]).not.toBeChecked();

            // Should NOT show decoupled indicator (still identified as own list)
            const decoupledText = screen.queryByText(/decoupled/i);
            expect(decoupledText).not.toBeInTheDocument();
        });

        it('initializes checked state from fixed localStorage key for shared list', () => {
            // Set up a different meal plan (so items are treated as shared)
            const differentItems: Ingredient[] = [
                { item: 'Potato', amount: '3' },
            ];
            const mealPlan: MealPlan = {
                recipes: [],
                shoppingList: differentItems,
            };
            localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify(mealPlan));

            // Set checked state using the fixed shared key
            const checkedKeys = ['Onion|1'];
            localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED_SHARED, JSON.stringify(checkedKeys));

            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={true}
                />
            );

            const checkboxes = screen.getAllByRole('checkbox');
            // Second checkbox should be checked (from hash-based localStorage)
            expect(checkboxes[0]).not.toBeChecked();
            expect(checkboxes[1]).toBeChecked();
            expect(checkboxes[2]).not.toBeChecked();
        });

        it('persists shared list checked state to SHOPPING_LIST_CHECKED_SHARED on toggle', async () => {
            const user = userEvent.setup();

            // Set up a different meal plan so items are treated as shared
            const differentItems: Ingredient[] = [
                { item: 'Potato', amount: '3' },
            ];
            const mealPlan: MealPlan = {
                recipes: [],
                shoppingList: differentItems,
            };
            localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify(mealPlan));

            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={true}
                />
            );

            // Toggle first checkbox
            const checkboxes = screen.getAllByRole('checkbox');
            await user.click(checkboxes[0]);

            // Verify it wrote to the shared localStorage key
            const stored = localStorage.getItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED_SHARED);
            expect(stored).not.toBeNull();
            const parsed = JSON.parse(stored!) as string[];
            expect(parsed).toContain('Tomato|2');
        });

        it('catches localStorage error when persisting shared list checked state', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const user = userEvent.setup();

            // Set up a different meal plan so items are treated as shared
            const differentItems: Ingredient[] = [
                { item: 'Potato', amount: '3' },
            ];
            const mealPlan: MealPlan = {
                recipes: [],
                shoppingList: differentItems,
            };
            localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify(mealPlan));

            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={true}
                />
            );

            // Make setItem throw for the shared key
            const originalSetItem = localStorage.setItem.bind(localStorage);
            vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
                if (key === STORAGE_KEYS.SHOPPING_LIST_CHECKED_SHARED) {
                    throw new DOMException('Quota exceeded', 'QuotaExceededError');
                }
                return originalSetItem(key, value);
            });

            // Toggle a checkbox — should not crash
            const checkboxes = screen.getAllByRole('checkbox');
            await user.click(checkboxes[0]);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Error saving shared shopping list checked state:',
                expect.any(DOMException)
            );

            // Component should still be rendered
            expect(screen.getByText('Tomato')).toBeInTheDocument();

            vi.restoreAllMocks();
        });

        it('does not parse localStorage multiple times on mount', () => {
            // Spy on localStorage.getItem to count calls
            const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

            const mealPlan: MealPlan = {
                recipes: [],
                shoppingList: mockItems,
            };
            localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify(mealPlan));

            renderWithSettings(
                <ShoppingList
                    items={mockItems}
                    isStandaloneView={true}
                />
            );

            // Count how many times MEAL_PLAN was accessed
            const mealPlanCalls = getItemSpy.mock.calls.filter(
                call => call[0] === STORAGE_KEYS.MEAL_PLAN
            );

            // Should only be called once (or at most twice during React's double-render in dev mode)
            // but definitely not 3+ times as before the refactoring
            expect(mealPlanCalls.length).toBeLessThanOrEqual(2);

            getItemSpy.mockRestore();
        });
    });
});
