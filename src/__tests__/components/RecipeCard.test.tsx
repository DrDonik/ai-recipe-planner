import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
