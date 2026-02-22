import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { WelcomeDialog } from '../../components/WelcomeDialog';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { STORAGE_KEYS } from '../../constants';

const renderWelcomeDialog = (onClose = vi.fn()) =>
    render(
        <SettingsProvider>
            <WelcomeDialog onClose={onClose} />
        </SettingsProvider>
    );

describe('WelcomeDialog localStorage error handling', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('calls onClose and logs error when setItem throws with dontShowAgain checked', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const onClose = vi.fn();
        const user = userEvent.setup();
        // Pre-seed so the "Don't show again" checkbox initialises as checked
        localStorage.setItem(STORAGE_KEYS.WELCOME_DISMISSED, 'true');

        renderWelcomeDialog(onClose);

        vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
            throw new DOMException('QuotaExceededError');
        });

        await user.click(screen.getByText('Get Started'));

        expect(consoleSpy).toHaveBeenCalledWith(
            'Error saving localStorage key "welcome_dismissed":',
            expect.any(DOMException)
        );
        // onClose still called despite the error
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
