import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

    afterEach(() => {
        vi.restoreAllMocks();
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
            `Error updating localStorage key "${STORAGE_KEYS.WELCOME_DISMISSED}":`,
            expect.any(DOMException)
        );
        // onClose still called despite the error
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose and logs error when removeItem throws with dontShowAgain unchecked', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const onClose = vi.fn();
        const user = userEvent.setup();
        // No WELCOME_DISMISSED in storage — checkbox starts unchecked

        renderWelcomeDialog(onClose);

        vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
            throw new DOMException('SecurityError');
        });

        await user.click(screen.getByText('Get Started'));

        expect(consoleSpy).toHaveBeenCalledWith(
            `Error updating localStorage key "${STORAGE_KEYS.WELCOME_DISMISSED}":`,
            expect.any(DOMException)
        );
        // onClose still called despite the error
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
