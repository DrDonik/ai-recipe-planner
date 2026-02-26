import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyPasteDialog } from '../../components/CopyPasteDialog';
import { renderWithSettings } from '../testUtils';

const defaultProps = {
    prompt: 'Test prompt content',
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
};

const setup = (props = {}) => {
    const merged = { ...defaultProps, ...props };
    renderWithSettings(<CopyPasteDialog {...merged} />);
    return { user: userEvent.setup(), props: merged };
};

beforeEach(() => {
    defaultProps.onSubmit = vi.fn();
    defaultProps.onCancel = vi.fn();
});

const clickCopyAndAdvanceToPaste = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: /Copy Prompt/i }));
    // Wait for the 600ms timer to transition to paste step
    await waitFor(() => {
        expect(screen.getByPlaceholderText(/Paste the exact AI response/i)).toBeInTheDocument();
    });
};

describe('CopyPasteDialog', () => {
    describe('initial render (copy step)', () => {
        it('renders dialog with title and prompt text', () => {
            setup();

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByText('Copy & Paste')).toBeInTheDocument();
            expect(screen.getByText('Test prompt content')).toBeInTheDocument();
        });

        it('renders a copy button', () => {
            setup();

            expect(screen.getByRole('button', { name: /Copy Prompt/i })).toBeInTheDocument();
        });

        it('renders a close button', () => {
            setup();

            expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
        });
    });

    describe('clipboard copy', () => {
        it('copies prompt to clipboard and shows Copied! feedback', async () => {
            const spy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
            const { user } = setup();

            await user.click(screen.getByRole('button', { name: /Copy Prompt/i }));

            expect(spy).toHaveBeenCalledWith('Test prompt content');
            expect(screen.getByText('Copied!')).toBeInTheDocument();
        });

        it('advances to paste step after clipboard success', async () => {
            const { user } = setup();

            await clickCopyAndAdvanceToPaste(user);

            expect(screen.getByPlaceholderText(/Paste the exact AI response/i)).toBeInTheDocument();
        });

        it('stays on copy step and shows error when clipboard write fails', async () => {
            vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new DOMException('Permission denied'));
            const { user } = setup();

            await user.click(screen.getByRole('button', { name: /Copy Prompt/i }));

            // Should stay on copy step with error message
            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText(/couldn't copy automatically/i)).toBeInTheDocument();
            // Should still show the copy button (not advanced to paste step)
            expect(screen.getByRole('button', { name: /Copy Prompt/i })).toBeInTheDocument();
        });
    });

    describe('paste step', () => {
        const advanceToPasteStep = async () => {
            const result = setup();
            await clickCopyAndAdvanceToPaste(result.user);
            return result;
        };

        beforeEach(() => {
            // Default: clipboard read fails so existing empty-submission tests still hit the error path
            vi.spyOn(navigator.clipboard, 'readText').mockRejectedValue(new DOMException('Permission denied'));
        });

        it('shows back and submit buttons', async () => {
            await advanceToPasteStep();

            expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Import Recipes/i })).toBeInTheDocument();
        });

        it('navigates back to copy step when Back is clicked', async () => {
            const { user } = await advanceToPasteStep();

            await user.click(screen.getByRole('button', { name: /Back/i }));

            expect(screen.getByRole('button', { name: /Copy Prompt/i })).toBeInTheDocument();
        });

        it('shows error when submitting empty response', async () => {
            const { user, props } = await advanceToPasteStep();

            await user.click(screen.getByRole('button', { name: /Import Recipes/i }));

            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText(/Please paste the AI's response first/i)).toBeInTheDocument();
            expect(props.onSubmit).not.toHaveBeenCalled();
        });

        it('calls onSubmit with response text', async () => {
            const { user, props } = await advanceToPasteStep();

            const textarea = screen.getByPlaceholderText(/Paste the exact AI response/i);
            await user.type(textarea, 'some recipe response');
            await user.click(screen.getByRole('button', { name: /Import Recipes/i }));

            expect(props.onSubmit).toHaveBeenCalledWith('some recipe response');
        });

        it('clears error when user starts typing', async () => {
            const { user } = await advanceToPasteStep();

            // Trigger the error first
            await user.click(screen.getByRole('button', { name: /Import Recipes/i }));
            expect(screen.getByRole('alert')).toBeInTheDocument();

            // Type in textarea to clear error
            const textarea = screen.getByPlaceholderText(/Paste the exact AI response/i);
            await user.type(textarea, 'a');

            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });

        it('auto-pastes clipboard content into textarea when textarea is empty', async () => {
            vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue('{"recipes": [{"title": "Pasta"}]}');
            const { user, props } = await advanceToPasteStep();

            await user.click(screen.getByRole('button', { name: /Import Recipes/i }));

            // Textarea should now contain the clipboard content
            const textarea = screen.getByPlaceholderText(/Paste the exact AI response/i);
            expect(textarea).toHaveValue('{"recipes": [{"title": "Pasta"}]}');
            // No error shown — user just needs to click Import Recipes once more to confirm
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
            // onSubmit not yet called; user reviews the pasted content first
            expect(props.onSubmit).not.toHaveBeenCalled();
        });

        it('shows error when textarea is empty and clipboard content is also empty', async () => {
            vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue('   ');
            const { user, props } = await advanceToPasteStep();

            await user.click(screen.getByRole('button', { name: /Import Recipes/i }));

            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText(/Please paste the AI's response first/i)).toBeInTheDocument();
            expect(props.onSubmit).not.toHaveBeenCalled();
        });
    });

    describe('cancel', () => {
        it('calls onCancel when close button is clicked', async () => {
            const { user, props } = setup();

            await user.click(screen.getByRole('button', { name: /Close/i }));

            expect(props.onCancel).toHaveBeenCalled();
        });
    });
});
