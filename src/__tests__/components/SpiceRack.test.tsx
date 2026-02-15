import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpiceRack } from '../../components/SpiceRack';
import { SettingsProvider } from '../../contexts/SettingsContext';

const renderWithSettings = (ui: React.ReactElement) => {
    return render(<SettingsProvider>{ui}</SettingsProvider>);
};

describe('SpiceRack', () => {
    it('renders spice rack with existing spices', () => {
        const mockAdd = vi.fn();
        const mockRemove = vi.fn();
        const mockToggle = vi.fn();

        renderWithSettings(
            <SpiceRack
                spices={['Salt', 'Pepper', 'Paprika']}
                onAddSpice={mockAdd}
                onRemoveSpice={mockRemove}
                isMinimized={false}
                onToggleMinimize={mockToggle}
            />
        );

        expect(screen.getByText('Salt')).toBeInTheDocument();
        expect(screen.getByText('Pepper')).toBeInTheDocument();
        expect(screen.getByText('Paprika')).toBeInTheDocument();
    });

    it('adds new spice when form is submitted', async () => {
        const user = userEvent.setup();
        const mockAdd = vi.fn();
        const mockRemove = vi.fn();
        const mockToggle = vi.fn();

        renderWithSettings(
            <SpiceRack
                spices={[]}
                onAddSpice={mockAdd}
                onRemoveSpice={mockRemove}
                isMinimized={false}
                onToggleMinimize={mockToggle}
            />
        );

        const spiceInput = screen.getByPlaceholderText(/Spices/i);
        const addButton = screen.getByRole('button', { name: /Add/i });

        await user.type(spiceInput, 'Cumin');
        await user.click(addButton);

        expect(mockAdd).toHaveBeenCalledWith('Cumin');
    });

    it('enforces maxLength of 200 on spice name input', () => {
        const mockAdd = vi.fn();
        const mockRemove = vi.fn();
        const mockToggle = vi.fn();

        renderWithSettings(
            <SpiceRack
                spices={[]}
                onAddSpice={mockAdd}
                onRemoveSpice={mockRemove}
                isMinimized={false}
                onToggleMinimize={mockToggle}
            />
        );

        const spiceInput = screen.getByPlaceholderText(/Spices/i);
        expect(spiceInput).toHaveAttribute('maxLength', '200');
    });

    it('does not add duplicate spices', async () => {
        const user = userEvent.setup();
        const mockAdd = vi.fn();
        const mockRemove = vi.fn();
        const mockToggle = vi.fn();

        renderWithSettings(
            <SpiceRack
                spices={['Salt']}
                onAddSpice={mockAdd}
                onRemoveSpice={mockRemove}
                isMinimized={false}
                onToggleMinimize={mockToggle}
            />
        );

        const spiceInput = screen.getByPlaceholderText(/Spices/i);
        const addButton = screen.getByRole('button', { name: /Add/i });

        await user.type(spiceInput, 'Salt');
        await user.click(addButton);

        expect(mockAdd).not.toHaveBeenCalled();
    });
});
