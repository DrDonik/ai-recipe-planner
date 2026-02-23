import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { RecipeCard } from '../../components/RecipeCard';
import type { Recipe } from '../../types';
import { SettingsProvider } from '../../contexts/SettingsContext';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...props}>{children}</div>,
    },
}));

const mockRecipe: Recipe = {
    id: 'recipe-1',
    title: 'Test Recipe',
    time: '30 min',
    ingredients: [
        { item: 'Tomato', amount: '2' },
        { item: 'Onion', amount: '1' },
    ],
    instructions: ['Step 1', 'Step 2'],
    usedIngredients: ['ingredient-1'],
    missingIngredients: [{ item: 'Salt', amount: '1 tsp' }],
    nutrition: {
        calories: 200,
        carbs: 20,
        fat: 10,
        protein: 15,
    },
};

const mockRecipeWithComments: Recipe = {
    ...mockRecipe,
    comments: 'Tomatoes were once considered poisonous in Europe.',
};

const renderWithSettings = (ui: React.ReactElement) => {
    return render(<SettingsProvider>{ui}</SettingsProvider>);
};

describe('RecipeCard', () => {
    describe('External Link Button (onViewSingle)', () => {
        it('renders external link button when showOpenInNewTab and onViewSingle are provided', () => {
            const onViewSingle = vi.fn();
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipe}
                    index={0}
                    showOpenInNewTab={true}
                    onViewSingle={onViewSingle}
                />
            );

            const button = screen.getByLabelText(/view recipe/i);
            expect(button).toBeInTheDocument();
        });

        it('does not render external link button when onViewSingle is not provided', () => {
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipe}
                    index={0}
                    showOpenInNewTab={true}
                />
            );

            const button = screen.queryByLabelText(/view recipe/i);
            expect(button).not.toBeInTheDocument();
        });

        it('does not render external link button when showOpenInNewTab is false', () => {
            const onViewSingle = vi.fn();
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipe}
                    index={0}
                    showOpenInNewTab={false}
                    onViewSingle={onViewSingle}
                />
            );

            const button = screen.queryByLabelText(/view recipe/i);
            expect(button).not.toBeInTheDocument();
        });

        it('calls onViewSingle when external link button is clicked', async () => {
            const user = userEvent.setup();
            const onViewSingle = vi.fn();
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipe}
                    index={0}
                    showOpenInNewTab={true}
                    onViewSingle={onViewSingle}
                />
            );

            const button = screen.getByLabelText(/view recipe/i);
            await user.click(button);

            expect(onViewSingle).toHaveBeenCalledTimes(1);
        });
    });

    describe('Close Button (onClose)', () => {
        it('renders close button when isStandalone and onClose are provided', () => {
            const onClose = vi.fn();
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipe}
                    index={0}
                    isStandalone={true}
                    onClose={onClose}
                />
            );

            const button = screen.getByLabelText(/close/i);
            expect(button).toBeInTheDocument();
        });

        it('does not render close button when onClose is not provided', () => {
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipe}
                    index={0}
                    isStandalone={true}
                />
            );

            const button = screen.queryByLabelText(/close/i);
            expect(button).not.toBeInTheDocument();
        });

        it('does not render close button when not in standalone mode', () => {
            const onClose = vi.fn();
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipe}
                    index={0}
                    isStandalone={false}
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
                <RecipeCard
                    recipe={mockRecipe}
                    index={0}
                    isStandalone={true}
                    onClose={onClose}
                />
            );

            const button = screen.getByLabelText(/close/i);
            await user.click(button);

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Delete Button', () => {
        it('renders delete button when onDelete is provided', () => {
            const onDelete = vi.fn();
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipe}
                    index={0}
                    onDelete={onDelete}
                />
            );

            const button = screen.getByLabelText(/delete/i);
            expect(button).toBeInTheDocument();
        });

        it('calls onDelete when delete button is clicked', async () => {
            const user = userEvent.setup();
            const onDelete = vi.fn();
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipe}
                    index={0}
                    onDelete={onDelete}
                />
            );

            const button = screen.getByLabelText(/delete/i);
            await user.click(button);

            expect(onDelete).toHaveBeenCalledTimes(1);
        });
    });

    describe('Wake Lock Button', () => {
        it('renders wake lock button in standalone mode when wakeLock is supported', () => {
            const wakeLock = {
                isSupported: true,
                isActive: false,
                toggle: vi.fn(),
            };
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipe}
                    index={0}
                    isStandalone={true}
                    wakeLock={wakeLock}
                />
            );

            const button = screen.getByLabelText(/keep screen on/i);
            expect(button).toBeInTheDocument();
        });

        it('does not render wake lock button when not in standalone mode', () => {
            const wakeLock = {
                isSupported: true,
                isActive: false,
                toggle: vi.fn(),
            };
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipe}
                    index={0}
                    isStandalone={false}
                    wakeLock={wakeLock}
                />
            );

            const button = screen.queryByLabelText(/keep screen on/i);
            expect(button).not.toBeInTheDocument();
        });

        it('calls toggle when wake lock button is clicked', async () => {
            const user = userEvent.setup();
            const wakeLock = {
                isSupported: true,
                isActive: false,
                toggle: vi.fn(),
            };
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipe}
                    index={0}
                    isStandalone={true}
                    wakeLock={wakeLock}
                />
            );

            const button = screen.getByLabelText(/keep screen on/i);
            await user.click(button);

            expect(wakeLock.toggle).toHaveBeenCalledTimes(1);
        });
    });

    describe('Recipe Content', () => {
        it('renders recipe title', () => {
            renderWithSettings(
                <RecipeCard recipe={mockRecipe} index={0} />
            );

            expect(screen.getByText('Test Recipe')).toBeInTheDocument();
        });

        it('renders recipe time', () => {
            renderWithSettings(
                <RecipeCard recipe={mockRecipe} index={0} />
            );

            expect(screen.getByText('30 min')).toBeInTheDocument();
        });

        it('renders all ingredients', () => {
            renderWithSettings(
                <RecipeCard recipe={mockRecipe} index={0} />
            );

            expect(screen.getByText('Tomato')).toBeInTheDocument();
            expect(screen.getByText('Onion')).toBeInTheDocument();
        });

        it('renders all instructions', () => {
            renderWithSettings(
                <RecipeCard recipe={mockRecipe} index={0} />
            );

            expect(screen.getByText('Step 1')).toBeInTheDocument();
            expect(screen.getByText('Step 2')).toBeInTheDocument();
        });

        it('renders missing ingredients section when present', () => {
            renderWithSettings(
                <RecipeCard recipe={mockRecipe} index={0} />
            );

            // Missing ingredients are displayed as "amount item" in a badge
            expect(screen.getByText(/1 tsp Salt/i)).toBeInTheDocument();
        });
    });

    describe('Comments (fun facts)', () => {
        it('renders comments in standalone mode when present', () => {
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipeWithComments}
                    index={0}
                    isStandalone={true}
                />
            );

            expect(screen.getByText('Tomatoes were once considered poisonous in Europe.')).toBeInTheDocument();
        });

        it('does not render comments in overview mode even when present', () => {
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipeWithComments}
                    index={0}
                    isStandalone={false}
                />
            );

            expect(screen.queryByText('Tomatoes were once considered poisonous in Europe.')).not.toBeInTheDocument();
        });

        it('does not render comments section when comments field is absent', () => {
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipe}
                    index={0}
                    isStandalone={true}
                />
            );

            expect(screen.queryByText('Tomatoes were once considered poisonous in Europe.')).not.toBeInTheDocument();
        });
    });

    describe('Standalone Mode', () => {
        it('uses larger text size in standalone mode', () => {
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipe}
                    index={0}
                    isStandalone={true}
                />
            );

            const title = screen.getByText('Test Recipe');
            expect(title).toHaveClass('text-3xl');
        });

        it('uses normal text size when not in standalone mode', () => {
            renderWithSettings(
                <RecipeCard
                    recipe={mockRecipe}
                    index={0}
                    isStandalone={false}
                />
            );

            const title = screen.getByText('Test Recipe');
            expect(title).toHaveClass('text-2xl');
        });
    });

    describe('JSON-LD Schema Generation', () => {
        it('does not show error alert when schema generation fails', () => {
            // Spy on console.error to verify it logs the error
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            // Create a recipe with unusual data that might cause schema issues
            const recipeWithUnusualData: Recipe = {
                ...mockRecipe,
                time: '', // Empty time might cause schema generation issues
            };

            renderWithSettings(
                <RecipeCard recipe={recipeWithUnusualData} index={0} />
            );

            // Should not show any error alert
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();

            consoleErrorSpy.mockRestore();
        });

        it('renders successfully with no user-facing errors', () => {
            // Recipe with valid data should render without issues
            renderWithSettings(
                <RecipeCard recipe={mockRecipe} index={0} />
            );

            // Recipe card should render successfully
            expect(screen.getByText('Test Recipe')).toBeInTheDocument();
            // Should not show any error alert
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });
    });

    describe('Ingredient Highlighting', () => {
        it('does not highlight ingredients in the ingredients list even when they appear in missingIngredients', () => {
            const recipeWithMissingSalt: Recipe = {
                ...mockRecipe,
                ingredients: [
                    { item: 'Rice', amount: '200g' },
                    { item: 'Salt', amount: '1 tsp' },
                ],
                missingIngredients: [{ item: 'Salt', amount: '1 tsp' }],
            };

            renderWithSettings(
                <RecipeCard recipe={recipeWithMissingSalt} index={0} />
            );

            // Ingredients should never be highlighted in amber — missing items are shown in the separate box
            const saltElement = screen.getByText('Salt');
            expect(saltElement).not.toHaveClass('text-amber-600');
            expect(saltElement).toHaveClass('text-text-main');
        });

        it('does not highlight any ingredient when missingIngredients is empty', () => {
            const recipeWithNoMissing: Recipe = {
                ...mockRecipe,
                ingredients: [
                    { item: 'Rice', amount: '200g' },
                    { item: 'Salt', amount: '1 tsp' },
                ],
                missingIngredients: [],
            };

            renderWithSettings(
                <RecipeCard recipe={recipeWithNoMissing} index={0} />
            );

            const riceElement = screen.getByText('Rice');
            const saltElement = screen.getByText('Salt');
            expect(riceElement).toHaveClass('text-text-main');
            expect(saltElement).toHaveClass('text-text-main');
        });
    });

    describe('Ingredient keyboard accessibility', () => {
        it('toggles strikethrough on Enter key press', () => {
            renderWithSettings(
                <RecipeCard recipe={mockRecipe} index={0} isStandalone />
            );

            const ingredient = screen.getByLabelText(/Tomato, 2/);
            expect(ingredient).toHaveAttribute('aria-pressed', 'false');

            fireEvent.keyDown(ingredient, { key: 'Enter' });

            expect(ingredient).toHaveAttribute('aria-pressed', 'true');
        });

        it('toggles strikethrough on Space key press', () => {
            renderWithSettings(
                <RecipeCard recipe={mockRecipe} index={0} isStandalone />
            );

            const ingredient = screen.getByLabelText(/Tomato, 2/);
            expect(ingredient).toHaveAttribute('aria-pressed', 'false');

            fireEvent.keyDown(ingredient, { key: ' ' });

            expect(ingredient).toHaveAttribute('aria-pressed', 'true');
        });

        it('toggles back to not-struck on second Enter press', () => {
            renderWithSettings(
                <RecipeCard recipe={mockRecipe} index={0} isStandalone />
            );

            const ingredient = screen.getByLabelText(/Tomato, 2/);

            fireEvent.keyDown(ingredient, { key: 'Enter' });
            expect(ingredient).toHaveAttribute('aria-pressed', 'true');

            fireEvent.keyDown(ingredient, { key: 'Enter' });
            expect(ingredient).toHaveAttribute('aria-pressed', 'false');
        });

        it('does not toggle on other keys like Tab', () => {
            renderWithSettings(
                <RecipeCard recipe={mockRecipe} index={0} isStandalone />
            );

            const ingredient = screen.getByLabelText(/Tomato, 2/);
            fireEvent.keyDown(ingredient, { key: 'Tab' });

            expect(ingredient).toHaveAttribute('aria-pressed', 'false');
        });
    });

    describe('Instruction step keyboard accessibility', () => {
        it('highlights step on Enter key press', () => {
            renderWithSettings(
                <RecipeCard recipe={mockRecipe} index={0} isStandalone />
            );

            const step = screen.getByText('Step 1');
            expect(step).not.toHaveAttribute('aria-current');

            fireEvent.keyDown(step, { key: 'Enter' });

            expect(step).toHaveAttribute('aria-current', 'step');
        });

        it('highlights step on Space key press', () => {
            renderWithSettings(
                <RecipeCard recipe={mockRecipe} index={0} isStandalone />
            );

            const step = screen.getByText('Step 1');
            fireEvent.keyDown(step, { key: ' ' });

            expect(step).toHaveAttribute('aria-current', 'step');
        });

        it('removes highlight when pressing Enter on already-active step', () => {
            renderWithSettings(
                <RecipeCard recipe={mockRecipe} index={0} isStandalone />
            );

            const step = screen.getByText('Step 1');

            fireEvent.keyDown(step, { key: 'Enter' });
            expect(step).toHaveAttribute('aria-current', 'step');

            fireEvent.keyDown(step, { key: 'Enter' });
            expect(step).not.toHaveAttribute('aria-current');
        });

        it('does not highlight on other keys', () => {
            renderWithSettings(
                <RecipeCard recipe={mockRecipe} index={0} isStandalone />
            );

            const step = screen.getByText('Step 1');
            fireEvent.keyDown(step, { key: 'Tab' });

            expect(step).not.toHaveAttribute('aria-current');
        });
    });
});
