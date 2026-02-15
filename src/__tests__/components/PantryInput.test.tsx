import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PantryInput } from '../../components/PantryInput';
import type { PantryItem } from '../../types';
import { renderWithSettings } from '../testUtils';

const mockPantryItems: PantryItem[] = [
    { id: '1', name: 'Carrots', amount: '2kg' },
    { id: '2', name: 'Tomatoes', amount: '500g' },
];

describe('PantryInput', () => {
    it('renders pantry items with clickable amounts', () => {
        const mockAdd = vi.fn();
        const mockRemove = vi.fn();
        const mockUpdate = vi.fn();
        const mockEmpty = vi.fn();
        const mockToggle = vi.fn();

        renderWithSettings(
            <PantryInput
                pantryItems={mockPantryItems}
                onAddPantryItem={mockAdd}
                onRemovePantryItem={mockRemove}
                onUpdatePantryItem={mockUpdate}
                onEmptyPantry={mockEmpty}
                isMinimized={false}
                onToggleMinimize={mockToggle}
            />
        );

        expect(screen.getByText('Carrots')).toBeInTheDocument();
        expect(screen.getByText('2kg')).toBeInTheDocument();
        expect(screen.getByText('Tomatoes')).toBeInTheDocument();
        expect(screen.getByText('500g')).toBeInTheDocument();
    });

    it('allows editing amount when clicking on it', async () => {
        const user = userEvent.setup();
        const mockAdd = vi.fn();
        const mockRemove = vi.fn();
        const mockUpdate = vi.fn();
        const mockEmpty = vi.fn();
        const mockToggle = vi.fn();

        renderWithSettings(
            <PantryInput
                pantryItems={mockPantryItems}
                onAddPantryItem={mockAdd}
                onRemovePantryItem={mockRemove}
                onUpdatePantryItem={mockUpdate}
                onEmptyPantry={mockEmpty}
                isMinimized={false}
                onToggleMinimize={mockToggle}
            />
        );

        const amountButton = screen.getByRole('button', { name: /Amount.*2kg/i });
        await user.click(amountButton);

        // Should now show an input with the current amount
        const input = screen.getByDisplayValue('2kg');
        expect(input).toBeInTheDocument();
        expect(input).toHaveFocus();
    });

    it('saves edited amount when pressing Enter', async () => {
        const user = userEvent.setup();
        const mockAdd = vi.fn();
        const mockRemove = vi.fn();
        const mockUpdate = vi.fn();
        const mockEmpty = vi.fn();
        const mockToggle = vi.fn();

        renderWithSettings(
            <PantryInput
                pantryItems={mockPantryItems}
                onAddPantryItem={mockAdd}
                onRemovePantryItem={mockRemove}
                onUpdatePantryItem={mockUpdate}
                onEmptyPantry={mockEmpty}
                isMinimized={false}
                onToggleMinimize={mockToggle}
            />
        );

        const amountButton = screen.getByRole('button', { name: /Amount.*2kg/i });
        await user.click(amountButton);

        const input = screen.getByDisplayValue('2kg');
        await user.clear(input);
        await user.type(input, '3kg');
        await user.keyboard('{Enter}');

        expect(mockUpdate).toHaveBeenCalledWith('1', '3kg');
    });

    it('cancels editing when pressing Escape', async () => {
        const user = userEvent.setup();
        const mockAdd = vi.fn();
        const mockRemove = vi.fn();
        const mockUpdate = vi.fn();
        const mockEmpty = vi.fn();
        const mockToggle = vi.fn();

        renderWithSettings(
            <PantryInput
                pantryItems={mockPantryItems}
                onAddPantryItem={mockAdd}
                onRemovePantryItem={mockRemove}
                onUpdatePantryItem={mockUpdate}
                onEmptyPantry={mockEmpty}
                isMinimized={false}
                onToggleMinimize={mockToggle}
            />
        );

        const amountButton = screen.getByRole('button', { name: /Amount.*2kg/i });
        await user.click(amountButton);

        const input = screen.getByDisplayValue('2kg');
        await user.clear(input);
        await user.type(input, '3kg');
        await user.keyboard('{Escape}');

        expect(mockUpdate).not.toHaveBeenCalled();
        // Should return to button display
        expect(screen.getByText('2kg')).toBeInTheDocument();
    });

    it('saves edited amount when input loses focus', async () => {
        const user = userEvent.setup();
        const mockAdd = vi.fn();
        const mockRemove = vi.fn();
        const mockUpdate = vi.fn();
        const mockEmpty = vi.fn();
        const mockToggle = vi.fn();

        renderWithSettings(
            <PantryInput
                pantryItems={mockPantryItems}
                onAddPantryItem={mockAdd}
                onRemovePantryItem={mockRemove}
                onUpdatePantryItem={mockUpdate}
                onEmptyPantry={mockEmpty}
                isMinimized={false}
                onToggleMinimize={mockToggle}
            />
        );

        const amountButton = screen.getByRole('button', { name: /Amount.*2kg/i });
        await user.click(amountButton);

        const input = screen.getByDisplayValue('2kg');
        await user.clear(input);
        await user.type(input, '5kg');

        // Trigger blur by clicking outside
        await user.click(document.body);

        expect(mockUpdate).toHaveBeenCalledWith('1', '5kg');
    });

    it('does not update when amount is empty or whitespace', async () => {
        const user = userEvent.setup();
        const mockAdd = vi.fn();
        const mockRemove = vi.fn();
        const mockUpdate = vi.fn();
        const mockEmpty = vi.fn();
        const mockToggle = vi.fn();

        renderWithSettings(
            <PantryInput
                pantryItems={mockPantryItems}
                onAddPantryItem={mockAdd}
                onRemovePantryItem={mockRemove}
                onUpdatePantryItem={mockUpdate}
                onEmptyPantry={mockEmpty}
                isMinimized={false}
                onToggleMinimize={mockToggle}
            />
        );

        const amountButton = screen.getByRole('button', { name: /Amount.*2kg/i });
        await user.click(amountButton);

        const input = screen.getByDisplayValue('2kg');
        await user.clear(input);
        await user.type(input, '   '); // Only whitespace
        await user.keyboard('{Enter}');

        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('adds new pantry item when form is submitted', async () => {
        const user = userEvent.setup();
        const mockAdd = vi.fn();
        const mockRemove = vi.fn();
        const mockUpdate = vi.fn();
        const mockEmpty = vi.fn();
        const mockToggle = vi.fn();

        renderWithSettings(
            <PantryInput
                pantryItems={[]}
                onAddPantryItem={mockAdd}
                onRemovePantryItem={mockRemove}
                onUpdatePantryItem={mockUpdate}
                onEmptyPantry={mockEmpty}
                isMinimized={false}
                onToggleMinimize={mockToggle}
            />
        );

        const ingredientInput = screen.getByPlaceholderText(/Ingredient/i);
        const amountInput = screen.getByPlaceholderText(/Amount/i);
        const addButton = screen.getByRole('button', { name: /Add/i });

        await user.type(ingredientInput, 'Potatoes');
        await user.type(amountInput, '1kg');
        await user.click(addButton);

        expect(mockAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Potatoes',
                amount: '1kg',
            })
        );
    });

    it('enforces maxLength of 200 on ingredient and amount inputs', () => {
        renderWithSettings(
            <PantryInput
                pantryItems={[]}
                onAddPantryItem={vi.fn()}
                onRemovePantryItem={vi.fn()}
                onUpdatePantryItem={vi.fn()}
                onEmptyPantry={vi.fn()}
                isMinimized={false}
                onToggleMinimize={vi.fn()}
            />
        );

        const ingredientInput = screen.getByPlaceholderText(/Ingredient/i);
        const amountInput = screen.getByPlaceholderText(/Amount/i);

        expect(ingredientInput).toHaveAttribute('maxLength', '200');
        expect(amountInput).toHaveAttribute('maxLength', '200');
    });
});
