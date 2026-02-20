import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from '../../components/SettingsPanel';
import { renderWithSettings } from '../testUtils';
import type { Notification } from '../../types/index';

const setup = (props = {}) => {
    const defaultProps = {
        optionsMinimized: false,
        setOptionsMinimized: vi.fn(),
        loading: false,
        handleGenerate: vi.fn(),
        notification: null,
        ...props,
    };
    renderWithSettings(<SettingsPanel {...defaultProps} />);
    return { user: userEvent.setup(), props: defaultProps };
};

describe('SettingsPanel', () => {
    it('renders diet preferences and settings', () => {
        setup();

        expect(screen.getByLabelText(/Diet/i)).toBeInTheDocument();
    });

    it('adds new style wish when form is submitted', async () => {
        const { user } = setup();

        const styleWishInput = screen.getByPlaceholderText(/Indian, Gluten-free/i);
        const addButton = screen.getByRole('button', { name: /Add/i });

        await user.type(styleWishInput, 'Low carb');
        await user.click(addButton);

        // After adding, the input should be cleared
        expect(styleWishInput).toHaveValue('');
        expect(screen.getByText('Low carb')).toBeInTheDocument();
    });

    it('enforces maxLength of 200 on style wishes input', () => {
        setup();

        const styleWishInput = screen.getByPlaceholderText(/Indian, Gluten-free/i);
        expect(styleWishInput).toHaveAttribute('maxLength', '200');
    });

    it('renders notification URLs as clickable links', () => {
        const notification: Notification = {
            type: 'error',
            message: 'Visit https://example.com for more info',
        };
        setup({ notification });

        const link = screen.getByRole('link', { name: 'https://example.com' });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', 'https://example.com');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders all URLs as clickable links when multiple URLs are present', () => {
        const notification: Notification = {
            type: 'error',
            message: 'See https://example.com and https://another.com for details',
        };
        setup({ notification });

        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(2);
        expect(links[0]).toHaveAttribute('href', 'https://example.com');
        expect(links[1]).toHaveAttribute('href', 'https://another.com');
    });

    it('does not add duplicate style wishes', async () => {
        const { user } = setup();

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
