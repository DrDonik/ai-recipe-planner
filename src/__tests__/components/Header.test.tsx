import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Header } from '../../components/Header';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { STORAGE_KEYS } from '../../constants';

const renderHeader = () =>
    render(
        <SettingsProvider>
            <Header
                headerMinimized={false}
                setHeaderMinimized={vi.fn()}
                onShowHelp={vi.fn()}
                onShowNotification={vi.fn()}
                onClearNotification={vi.fn()}
            />
        </SettingsProvider>
    );

describe('Header localStorage error handling', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does not crash and logs error when setItem throws on security dialog accept', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const user = userEvent.setup();
        // An existing API key triggers the security dialog on mount
        localStorage.setItem(STORAGE_KEYS.API_KEY, 'my-test-key');

        renderHeader();

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
            throw new DOMException('QuotaExceededError');
        });

        await user.click(screen.getByText('I understand, continue'));

        expect(consoleSpy).toHaveBeenCalledWith(
            'Error saving localStorage key "api_key_warning_seen":',
            expect.any(DOMException)
        );
        // Dialog closed despite the error
        expect(screen.queryByText('I understand, continue')).not.toBeInTheDocument();
    });

    it('does not crash and logs error when setItem throws on "Use Copy & Paste" click', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const user = userEvent.setup();
        localStorage.setItem(STORAGE_KEYS.API_KEY, 'my-test-key');

        renderHeader();

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
            throw new DOMException('QuotaExceededError');
        });

        await user.click(screen.getByText('Use Copy & Paste instead'));

        expect(consoleSpy).toHaveBeenCalledWith(
            'Error saving localStorage key "api_key_warning_seen":',
            expect.any(DOMException)
        );
        // Security dialog accept button is gone
        expect(screen.queryByText('I understand, continue')).not.toBeInTheDocument();
    });
});
