import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ShoppingList } from '../../components/ShoppingList';
import type { Ingredient } from '../../types';
import { SettingsProvider } from '../../contexts/SettingsContext';

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
});
