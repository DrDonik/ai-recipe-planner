import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KitchenAppliances } from '../../components/KitchenAppliances';
import { renderWithSettings } from '../testUtils';

const setup = (props = {}) => {
    const defaultProps = {
        appliances: [],
        onAddAppliance: vi.fn(),
        onRemoveAppliance: vi.fn(),
        isMinimized: false,
        onToggleMinimize: vi.fn(),
        ...props,
    };
    renderWithSettings(<KitchenAppliances {...defaultProps} />);
    return { user: userEvent.setup(), props: defaultProps };
};

describe('KitchenAppliances', () => {
    it('renders existing appliances', () => {
        setup({ appliances: ['Air Fryer', 'Instant Pot', 'Vitamix'] });

        expect(screen.getByText('Air Fryer')).toBeInTheDocument();
        expect(screen.getByText('Instant Pot')).toBeInTheDocument();
        expect(screen.getByText('Vitamix')).toBeInTheDocument();
    });

    it('adds new appliance when form is submitted', async () => {
        const { user, props } = setup();

        const input = screen.getByPlaceholderText(/air fryer/i);
        const addButton = screen.getByRole('button', { name: /Add/i });

        await user.type(input, 'Air Fryer');
        await user.click(addButton);

        expect(props.onAddAppliance).toHaveBeenCalledWith('Air Fryer');
    });

    it('adds new appliance on Enter key', async () => {
        const { user, props } = setup();

        const input = screen.getByPlaceholderText(/air fryer/i);

        await user.type(input, 'Instant Pot{Enter}');

        expect(props.onAddAppliance).toHaveBeenCalledWith('Instant Pot');
    });

    it('enforces maxLength of 200 on appliance name input', () => {
        setup();

        const input = screen.getByPlaceholderText(/air fryer/i);
        expect(input).toHaveAttribute('maxLength', '200');
    });

    it('does not add duplicate appliances', async () => {
        const { user, props } = setup({ appliances: ['Air Fryer'] });

        const input = screen.getByPlaceholderText(/air fryer/i);
        const addButton = screen.getByRole('button', { name: /Add/i });

        await user.type(input, 'Air Fryer');
        await user.click(addButton);

        expect(props.onAddAppliance).not.toHaveBeenCalled();
    });

    it('calls onRemoveAppliance when remove button is clicked', async () => {
        const { user, props } = setup({ appliances: ['Air Fryer'] });

        const removeButton = screen.getByRole('button', { name: /remove/i });
        await user.click(removeButton);

        expect(props.onRemoveAppliance).toHaveBeenCalledWith('Air Fryer');
    });

    it('shows empty state message when no appliances exist', () => {
        setup({ appliances: [] });

        expect(screen.getByText(/no appliances added yet/i)).toBeInTheDocument();
    });

    it('does not render form or items when minimized', () => {
        setup({ appliances: ['Air Fryer'], isMinimized: true });

        expect(screen.queryByPlaceholderText(/air fryer/i)).not.toBeInTheDocument();
        expect(screen.queryByText('Air Fryer')).not.toBeInTheDocument();
    });

    it('calls onToggleMinimize when minimize button is clicked', async () => {
        const { user, props } = setup();

        // PanelHeader renders a minimize toggle button
        const minimizeButton = screen.getByRole('button', { name: /minimize|collapse/i });
        await user.click(minimizeButton);

        expect(props.onToggleMinimize).toHaveBeenCalled();
    });

    it('clears input field after adding an appliance', async () => {
        const { user } = setup();

        const input = screen.getByPlaceholderText(/air fryer/i);
        const addButton = screen.getByRole('button', { name: /Add/i });

        await user.type(input, 'Vitamix');
        await user.click(addButton);

        expect(input).toHaveValue('');
    });

    it('trims whitespace before adding appliance', async () => {
        const { user, props } = setup();

        const input = screen.getByPlaceholderText(/air fryer/i);
        const addButton = screen.getByRole('button', { name: /Add/i });

        await user.type(input, '  Air Fryer  ');
        await user.click(addButton);

        expect(props.onAddAppliance).toHaveBeenCalledWith('Air Fryer');
    });
});
