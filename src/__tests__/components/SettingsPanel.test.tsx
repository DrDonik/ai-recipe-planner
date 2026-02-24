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

    it('removes a style wish when trash button is clicked', async () => {
        const { user } = setup();

        const styleWishInput = screen.getByPlaceholderText(/Indian, Gluten-free/i);
        const addButton = screen.getByRole('button', { name: /Add/i });

        // Add a style wish
        await user.type(styleWishInput, 'Spicy');
        await user.click(addButton);
        expect(screen.getByText('Spicy')).toBeInTheDocument();

        // Click the remove button
        const removeButton = screen.getByRole('button', { name: 'Remove' });
        await user.click(removeButton);

        expect(screen.queryByText('Spicy')).not.toBeInTheDocument();
    });

    describe('minimize/expand toggle', () => {
        it('calls setOptionsMinimized when toggle is clicked', async () => {
            const { user, props } = setup();

            const collapseButton = screen.getByRole('button', { name: 'Collapse' });
            await user.click(collapseButton);

            expect(props.setOptionsMinimized).toHaveBeenCalledWith(true);
        });

        it('shows Expand button when minimized', () => {
            setup({ optionsMinimized: true });

            expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
        });

        it('hides style wishes, people, and meals when minimized', () => {
            setup({ optionsMinimized: true });

            expect(screen.queryByPlaceholderText(/Indian, Gluten-free/i)).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Decrease people count' })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Decrease meals count' })).not.toBeInTheDocument();
        });
    });

    describe('people counter', () => {
        it('increments people count', async () => {
            const { user } = setup();

            const increaseButton = screen.getByRole('button', { name: 'Increase people count' });
            // Default is 2, click to go to 3
            await user.click(increaseButton);

            const peopleGroup = screen.getByRole('group', { name: /People/i });
            expect(peopleGroup).toHaveTextContent('3');
        });

        it('decrements people count', async () => {
            const { user } = setup();

            const decreaseButton = screen.getByRole('button', { name: 'Decrease people count' });
            // Default is 2, click to go to 1
            await user.click(decreaseButton);

            const peopleGroup = screen.getByRole('group', { name: /People/i });
            expect(peopleGroup).toHaveTextContent('1');
        });

        it('clamps people count at minimum 1', async () => {
            const { user } = setup();

            const decreaseButton = screen.getByRole('button', { name: 'Decrease people count' });
            // Default is 2, click twice to try going below 1
            await user.click(decreaseButton);
            await user.click(decreaseButton);

            const peopleGroup = screen.getByRole('group', { name: /People/i });
            expect(peopleGroup).toHaveTextContent('1');
        });

        it('clamps people count at maximum 20', async () => {
            const { user } = setup();

            const increaseButton = screen.getByRole('button', { name: 'Increase people count' });
            // Click 19 times from default 2 to reach 20, then one more
            for (let i = 0; i < 19; i++) {
                await user.click(increaseButton);
            }

            const peopleGroup = screen.getByRole('group', { name: /People/i });
            expect(peopleGroup).toHaveTextContent('20');

            // One more click should stay at 20
            await user.click(increaseButton);
            expect(peopleGroup).toHaveTextContent('20');
        });
    });

    describe('meals counter', () => {
        it('increments meals count', async () => {
            const { user } = setup();

            const increaseButton = screen.getByRole('button', { name: 'Increase meals count' });
            // Default is 3, click to go to 4
            await user.click(increaseButton);

            const mealsGroup = screen.getByRole('group', { name: /Meals/i });
            expect(mealsGroup).toHaveTextContent('4');
        });

        it('decrements meals count', async () => {
            const { user } = setup();

            const decreaseButton = screen.getByRole('button', { name: 'Decrease meals count' });
            // Default is 3, click to go to 2
            await user.click(decreaseButton);

            // People default is also 2, so we need to find meals counter specifically
            const mealsGroup = screen.getByRole('group', { name: /Meals/i });
            expect(mealsGroup).toHaveTextContent('2');
        });

        it('clamps meals count at minimum 1', async () => {
            const { user } = setup();

            const decreaseButton = screen.getByRole('button', { name: 'Decrease meals count' });
            // Default is 3, click 3 times to try going below 1
            for (let i = 0; i < 3; i++) {
                await user.click(decreaseButton);
            }

            const mealsGroup = screen.getByRole('group', { name: /Meals/i });
            expect(mealsGroup).toHaveTextContent('1');
        });

        it('clamps meals count at maximum 10', async () => {
            const { user } = setup();

            const increaseButton = screen.getByRole('button', { name: 'Increase meals count' });
            // Click 8 times from default 3 to reach 10, then one more
            for (let i = 0; i < 8; i++) {
                await user.click(increaseButton);
            }

            const mealsGroup = screen.getByRole('group', { name: /Meals/i });
            expect(mealsGroup).toHaveTextContent('10');

            // One more click should stay at 10
            await user.click(increaseButton);
            expect(mealsGroup).toHaveTextContent('10');
        });
    });
});
