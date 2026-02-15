import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from '../../components/SettingsPanel';
import { SettingsProvider } from '../../contexts/SettingsContext';

const renderWithSettings = (ui: React.ReactElement) => {
    return render(<SettingsProvider>{ui}</SettingsProvider>);
};

describe('SettingsPanel', () => {
    it('renders diet preferences and settings', () => {
        const mockGenerate = vi.fn();
        const mockSetMinimized = vi.fn();

        renderWithSettings(
            <SettingsPanel
                optionsMinimized={false}
                setOptionsMinimized={mockSetMinimized}
                loading={false}
                handleGenerate={mockGenerate}
                notification={null}
            />
        );

        expect(screen.getByLabelText(/Diet/i)).toBeInTheDocument();
    });

    it('adds new style wish when form is submitted', async () => {
        const user = userEvent.setup();
        const mockGenerate = vi.fn();
        const mockSetMinimized = vi.fn();

        renderWithSettings(
            <SettingsPanel
                optionsMinimized={false}
                setOptionsMinimized={mockSetMinimized}
                loading={false}
                handleGenerate={mockGenerate}
                notification={null}
            />
        );

        const styleWishInput = screen.getByPlaceholderText(/Indian, Gluten-free/i);
        const addButton = screen.getByRole('button', { name: /Add/i });

        await user.type(styleWishInput, 'Low carb');
        await user.click(addButton);

        // After adding, the input should be cleared
        expect(styleWishInput).toHaveValue('');
        expect(screen.getByText('Low carb')).toBeInTheDocument();
    });

    it('enforces maxLength of 200 on style wishes input', () => {
        const mockGenerate = vi.fn();
        const mockSetMinimized = vi.fn();

        renderWithSettings(
            <SettingsPanel
                optionsMinimized={false}
                setOptionsMinimized={mockSetMinimized}
                loading={false}
                handleGenerate={mockGenerate}
                notification={null}
            />
        );

        const styleWishInput = screen.getByPlaceholderText(/Indian, Gluten-free/i);
        expect(styleWishInput).toHaveAttribute('maxLength', '200');
    });

    it('does not add duplicate style wishes', async () => {
        const user = userEvent.setup();
        const mockGenerate = vi.fn();
        const mockSetMinimized = vi.fn();

        renderWithSettings(
            <SettingsPanel
                optionsMinimized={false}
                setOptionsMinimized={mockSetMinimized}
                loading={false}
                handleGenerate={mockGenerate}
                notification={null}
            />
        );

        const styleWishInput = screen.getByPlaceholderText(/Indian, Gluten-free/i);
        const addButton = screen.getByRole('button', { name: /Add/i });

        // Add first style wish
        await user.type(styleWishInput, 'Quick meals');
        await user.click(addButton);

        // Try to add the same wish again
        await user.type(styleWishInput, 'Quick meals');
        await user.click(addButton);

        // Should only appear once
        const wishes = screen.getAllByText('Quick meals');
        expect(wishes).toHaveLength(1);
    });
});
