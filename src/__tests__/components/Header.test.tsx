import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Header } from '../../components/Header';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { STORAGE_KEYS } from '../../constants';

interface SetupOptions {
    headerMinimized?: boolean;
    presetApiKey?: string;
    presetUseCopyPaste?: boolean;
    presetWarningDismissed?: boolean;
}

function setup(options: SetupOptions = {}) {
    const {
        headerMinimized = false,
        presetApiKey,
        presetUseCopyPaste,
        presetWarningDismissed = true,
    } = options;

    if (presetApiKey !== undefined) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, presetApiKey);
    }
    if (presetUseCopyPaste !== undefined) {
        localStorage.setItem(STORAGE_KEYS.USE_COPY_PASTE, String(presetUseCopyPaste));
    }
    if (presetWarningDismissed) {
        localStorage.setItem(STORAGE_KEYS.API_KEY_WARNING_SEEN, 'true');
    }

    const props = {
        headerMinimized,
        setHeaderMinimized: vi.fn(),
        onShowHelp: vi.fn(),
        onShowNotification: vi.fn(),
        onClearNotification: vi.fn(),
    };

    render(
        <SettingsProvider>
            <Header {...props} />
        </SettingsProvider>
    );

    return { user: userEvent.setup(), props };
}

describe('Header', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('expanded rendering', () => {
        it('shows subtitle, help button, mode toggle, and language selector when expanded', () => {
            setup();

            expect(screen.getByText('Turn your pantry into plans')).toBeInTheDocument();
            expect(screen.getByText('Copy & Paste')).toBeInTheDocument();
            expect(screen.getByText('API Key')).toBeInTheDocument();
            expect(screen.getByRole('switch')).toBeInTheDocument();
            expect(screen.getByLabelText('Select language')).toBeInTheDocument();
        });

        it('does not show expanded content when headerMinimized is true', () => {
            setup({ headerMinimized: true });

            expect(screen.queryByText('Turn your pantry into plans')).not.toBeInTheDocument();
            expect(screen.queryByLabelText('Select language')).not.toBeInTheDocument();
        });
    });

    describe('minimize toggle', () => {
        it('calls setHeaderMinimized when toggle button is clicked', async () => {
            const { user, props } = setup();

            const toggleButton = screen.getByRole('button', { name: 'Collapse' });
            await user.click(toggleButton);

            expect(props.setHeaderMinimized).toHaveBeenCalledWith(true);
        });

        it('shows Expand button when minimized', () => {
            setup({ headerMinimized: true });

            expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
        });
    });

    describe('help button', () => {
        it('calls onShowHelp when help button is clicked', async () => {
            const { user, props } = setup();

            const helpButton = screen.getByLabelText('Welcome to AI Recipe Planner');
            await user.click(helpButton);

            expect(props.onShowHelp).toHaveBeenCalledTimes(1);
        });
    });

    describe('mode toggle', () => {
        it('opens ApiKeySecurityDialog when switching from Copy&Paste to API Key mode', async () => {
            const { user } = setup({ presetUseCopyPaste: true });

            const modeSwitch = screen.getByRole('switch');
            await user.click(modeSwitch);

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByText('I understand, continue')).toBeInTheDocument();
        });

        it('accept in security dialog switches to API Key mode', async () => {
            const { user } = setup({ presetUseCopyPaste: true, presetWarningDismissed: false });

            const modeSwitch = screen.getByRole('switch');
            await user.click(modeSwitch);

            await user.click(screen.getByText('I understand, continue'));

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(screen.getByLabelText('Gemini API Key')).toBeInTheDocument();
        });

        it('switches directly to Copy&Paste when in API Key mode with no key', async () => {
            const { user } = setup({ presetUseCopyPaste: false });

            expect(screen.getByLabelText('Gemini API Key')).toBeInTheDocument();

            const modeSwitch = screen.getByRole('switch');
            await user.click(modeSwitch);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(screen.queryByLabelText('Gemini API Key')).not.toBeInTheDocument();
        });

        it('opens ClearApiKeyDialog when switching from API Key to Copy&Paste with existing key', async () => {
            const { user } = setup({ presetUseCopyPaste: false, presetApiKey: 'test-key-123' });

            const modeSwitch = screen.getByRole('switch');
            await user.click(modeSwitch);

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByText('Clear API Key?')).toBeInTheDocument();
        });
    });

    describe('ClearApiKeyDialog interactions', () => {
        it('Keep button closes dialog, switches mode, and keeps the key', async () => {
            const { user } = setup({ presetUseCopyPaste: false, presetApiKey: 'test-key-123' });

            await user.click(screen.getByRole('switch'));
            expect(screen.getByText('Clear API Key?')).toBeInTheDocument();

            await user.click(screen.getByText('No, keep it'));

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(screen.queryByLabelText('Gemini API Key')).not.toBeInTheDocument();
            const warningButtons = screen.getAllByLabelText('API key stored in local storage');
            expect(warningButtons.length).toBeGreaterThanOrEqual(1);
        });

        it('Clear button clears key and shows undo notification', async () => {
            const { user, props } = setup({ presetUseCopyPaste: false, presetApiKey: 'test-key-123' });

            await user.click(screen.getByRole('switch'));
            await user.click(screen.getByText('Yes, clear it'));

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(props.onShowNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'undo',
                    action: expect.objectContaining({ label: 'Undo' }),
                })
            );
        });
    });

    describe('security dialog Use Copy & Paste path', () => {
        it('opens ClearApiKeyDialog when choosing Copy&Paste and an API key exists', async () => {
            const { user } = setup({
                presetApiKey: 'test-key-123',
                presetUseCopyPaste: false,
                presetWarningDismissed: false,
            });

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            await user.click(screen.getByText('Use Copy & Paste instead'));

            expect(screen.getByText('Clear API Key?')).toBeInTheDocument();
        });

        it('switches directly to Copy&Paste when choosing it and no API key exists', async () => {
            const { user } = setup({ presetUseCopyPaste: true, presetWarningDismissed: false });

            const modeSwitch = screen.getByRole('switch');
            await user.click(modeSwitch);

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            await user.click(screen.getByText('Use Copy & Paste instead'));

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    describe('language selector', () => {
        it('renders language options and allows selection', async () => {
            const { user } = setup();

            const langSelect = screen.getByLabelText('Select language');
            const options = within(langSelect as HTMLElement).getAllByRole('option');
            expect(options).toHaveLength(4);

            await user.selectOptions(langSelect, 'German');
            expect(langSelect).toHaveValue('German');
        });
    });

    describe('API key input', () => {
        it('shows API key input when in API Key mode', () => {
            setup({ presetUseCopyPaste: false });

            expect(screen.getByLabelText('Gemini API Key')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Paste Gemini API Key')).toBeInTheDocument();
        });

        it('does not show API key input when in Copy&Paste mode', () => {
            setup({ presetUseCopyPaste: true });

            expect(screen.queryByLabelText('Gemini API Key')).not.toBeInTheDocument();
        });

        it('shows Get API Key link in API Key mode', () => {
            setup({ presetUseCopyPaste: false });

            const link = screen.getByTitle('Get API key');
            expect(link).toHaveAttribute('target', '_blank');
            expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        });
    });

    describe('warning indicator', () => {
        it('shows warning triangle when in Copy&Paste mode with stored API key', () => {
            setup({ presetUseCopyPaste: true, presetApiKey: 'test-key-123' });

            const warnings = screen.getAllByLabelText('API key stored in local storage');
            expect(warnings.length).toBeGreaterThanOrEqual(1);
        });

        it('does not show warning when no API key is stored', () => {
            setup({ presetUseCopyPaste: true });

            expect(screen.queryByLabelText('API key stored in local storage')).not.toBeInTheDocument();
        });

        it('shows warning in minimized mode when useCopyPaste and apiKey', () => {
            setup({ headerMinimized: true, presetUseCopyPaste: true, presetApiKey: 'test-key-123' });

            expect(screen.getByLabelText('API key stored in local storage')).toBeInTheDocument();
        });

        it('clicking warning in minimized mode opens ClearApiKeyDialog', async () => {
            const { user } = setup({ headerMinimized: true, presetUseCopyPaste: true, presetApiKey: 'test-key-123' });

            const warning = screen.getByLabelText('API key stored in local storage');
            await user.click(warning);

            expect(screen.getByText('Clear API Key?')).toBeInTheDocument();
        });
    });
});

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
        localStorage.setItem(STORAGE_KEYS.API_KEY, 'my-test-key');

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

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
            throw new DOMException('QuotaExceededError');
        });

        await user.click(screen.getByText('I understand, continue'));

        expect(consoleSpy).toHaveBeenCalledWith(
            'Error saving localStorage key "api_key_warning_seen":',
            expect.any(DOMException)
        );
        expect(screen.queryByText('I understand, continue')).not.toBeInTheDocument();
    });

    it('does not crash and logs error when setItem throws on "Use Copy & Paste" click', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const user = userEvent.setup();
        localStorage.setItem(STORAGE_KEYS.API_KEY, 'my-test-key');

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

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
            throw new DOMException('QuotaExceededError');
        });

        await user.click(screen.getByText('Use Copy & Paste instead'));

        expect(consoleSpy).toHaveBeenCalledWith(
            'Error saving localStorage key "api_key_warning_seen":',
            expect.any(DOMException)
        );
        expect(screen.queryByText('I understand, continue')).not.toBeInTheDocument();
    });
});
