import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpiceRack } from '../../components/SpiceRack';
import { renderWithSettings } from '../testUtils';

const setup = (props = {}) => {
    const defaultProps = {
        spices: [],
        onAddSpice: vi.fn(),
        onRemoveSpice: vi.fn(),
        isMinimized: false,
        onToggleMinimize: vi.fn(),
        ...props,
    };
    renderWithSettings(<SpiceRack {...defaultProps} />);
    return { user: userEvent.setup(), props: defaultProps };
};

describe('SpiceRack', () => {
    it('renders spice rack with existing spices', () => {
        setup({ spices: ['Salt', 'Pepper', 'Paprika'] });

        expect(screen.getByText('Salt')).toBeInTheDocument();
        expect(screen.getByText('Pepper')).toBeInTheDocument();
        expect(screen.getByText('Paprika')).toBeInTheDocument();
    });

    it('adds new spice when form is submitted', async () => {
        const { user, props } = setup();

        const spiceInput = screen.getByPlaceholderText(/Spices/i);
        const addButton = screen.getByRole('button', { name: /Add/i });

        await user.type(spiceInput, 'Cumin');
        await user.click(addButton);

        expect(props.onAddSpice).toHaveBeenCalledWith('Cumin');
    });

    it('enforces maxLength of 200 on spice name input', () => {
        setup();

        const spiceInput = screen.getByPlaceholderText(/Spices/i);
        expect(spiceInput).toHaveAttribute('maxLength', '200');
    });

    it('does not add duplicate spices', async () => {
        const { user, props } = setup({ spices: ['Salt'] });

        const spiceInput = screen.getByPlaceholderText(/Spices/i);
        const addButton = screen.getByRole('button', { name: /Add/i });

        await user.type(spiceInput, 'Salt');
        await user.click(addButton);

        expect(props.onAddSpice).not.toHaveBeenCalled();
    });
});
