import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { GistSyncDialog } from '@/components/GistSyncDialog';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { GIST_API, STORAGE_KEYS } from '@/constants';

const server = setupServer();

const originalReload = window.location.reload;

const renderDialog = (overrides: Partial<{
    onClose: () => void;
    syncStatus: 'idle' | 'synced' | 'error' | 'pending' | 'pulling' | 'pushing';
    onShowError: (msg: string) => void;
    onShowInfo: (msg: string) => void;
}> = {}) => {
    const props = {
        onClose: vi.fn(),
        syncStatus: 'idle' as const,
        onShowError: vi.fn(),
        onShowInfo: vi.fn(),
        ...overrides,
    };
    const view = render(
        <SettingsProvider>
            <GistSyncDialog {...props} />
        </SettingsProvider>,
    );
    return { ...view, user: userEvent.setup(), props };
};

describe('GistSyncDialog', () => {
    beforeEach(() => {
        server.listen({ onUnhandledRequest: 'error' });
        localStorage.clear();
        // Stub reload so we do not actually tear down the test DOM. Each test
        // asserts on window.location.reload being called.
        Object.defineProperty(window.location, 'reload', {
            configurable: true,
            writable: true,
            value: vi.fn(),
        });
    });

    afterEach(() => {
        server.resetHandlers();
        server.close();
        // Restore the real reload implementation.
        Object.defineProperty(window.location, 'reload', {
            configurable: true,
            writable: true,
            value: originalReload,
        });
    });

    describe('warning step (first-time user)', () => {
        it('shows the security warning when no token warning has been acknowledged', () => {
            renderDialog();
            expect(screen.getByText(/GitHub Token Storage Notice/i)).toBeInTheDocument();
        });

        it('advances to setup after accepting the warning and marks it seen', async () => {
            const { user } = renderDialog();
            await user.click(screen.getByRole('button', { name: /I understand, continue/i }));
            expect(localStorage.getItem(STORAGE_KEYS.GIST_TOKEN_WARNING_SEEN)).toBe('true');
            expect(screen.getByText(/Set up sync/i)).toBeInTheDocument();
        });

        it('cancel from warning step calls onClose', async () => {
            const onClose = vi.fn();
            const { user } = renderDialog({ onClose });
            await user.click(screen.getByRole('button', { name: /^Cancel$/i }));
            expect(onClose).toHaveBeenCalled();
        });
    });

    describe('setup step', () => {
        beforeEach(() => {
            localStorage.setItem(STORAGE_KEYS.GIST_TOKEN_WARNING_SEEN, 'true');
        });

        it('renders the setup form directly when warning has been seen', () => {
            renderDialog();
            expect(screen.getByText(/Set up sync/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Personal Access Token/i)).toBeInTheDocument();
        });

        it('shows field error when creating a new gist without a token', async () => {
            const { user } = renderDialog();
            await user.click(screen.getByRole('button', { name: /Create new Gist/i }));
            expect(await screen.findByRole('alert')).toHaveTextContent(/token/i);
        });

        it('shows field error when using existing gist without id', async () => {
            const { user } = renderDialog();
            await user.type(screen.getByLabelText(/Personal Access Token/i), 'ghp_abc');
            await user.click(screen.getByRole('button', { name: /Use existing Gist/i }));
            expect(await screen.findByRole('alert')).toHaveTextContent(/Gist ID/i);
        });

        it('creates a new gist, persists config, and reloads', async () => {
            const newId = 'created-gist-42';
            server.use(
                http.post(GIST_API.BASE_URL, async ({ request }) => {
                    expect(request.headers.get('Authorization')).toBe('Bearer ghp_token');
                    return HttpResponse.json({ id: newId, files: {} });
                }),
            );

            const { user } = renderDialog();
            await user.type(screen.getByLabelText(/Personal Access Token/i), 'ghp_token');
            await user.click(screen.getByRole('button', { name: /Create new Gist/i }));

            await waitFor(() => {
                expect(window.location.reload).toHaveBeenCalled();
            });
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.GIST_TOKEN)!)).toBe('ghp_token');
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.GIST_ID)!)).toBe(newId);
        });

        it('uses an existing gist: pulls, persists config, and reloads', async () => {
            const existingId = 'existing-gist-7';
            server.use(
                http.get(`${GIST_API.BASE_URL}/${existingId}`, () =>
                    HttpResponse.json({
                        id: existingId,
                        files: {
                            [GIST_API.FILENAME]: {
                                content: JSON.stringify({
                                    version: 1,
                                    updatedAt: '2026-01-01T00:00:00Z',
                                    data: { [STORAGE_KEYS.PEOPLE_COUNT]: 6 },
                                }),
                            },
                        },
                    }),
                ),
            );

            const { user } = renderDialog();
            await user.type(screen.getByLabelText(/Personal Access Token/i), 'ghp_token');
            await user.type(screen.getByLabelText(/Gist ID/i), existingId);
            await user.click(screen.getByRole('button', { name: /Use existing Gist/i }));

            await waitFor(() => expect(window.location.reload).toHaveBeenCalled());
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.GIST_TOKEN)!)).toBe('ghp_token');
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.GIST_ID)!)).toBe(existingId);
            // Pulled payload is applied
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PEOPLE_COUNT)!)).toBe(6);
        });

        it('surfaces unauthorized error without persisting config', async () => {
            const existingId = 'whatever';
            server.use(
                http.get(`${GIST_API.BASE_URL}/${existingId}`, () => new HttpResponse(null, { status: 401 })),
            );
            const onShowError = vi.fn();
            const { user } = renderDialog({ onShowError });

            await user.type(screen.getByLabelText(/Personal Access Token/i), 'bad-token');
            await user.type(screen.getByLabelText(/Gist ID/i), existingId);
            await user.click(screen.getByRole('button', { name: /Use existing Gist/i }));

            await waitFor(() => expect(onShowError).toHaveBeenCalled());
            expect(onShowError.mock.calls[0][0]).toMatch(/unauthorized/i);
            expect(localStorage.getItem(STORAGE_KEYS.GIST_TOKEN)).toBeNull();
            expect(localStorage.getItem(STORAGE_KEYS.GIST_ID)).toBeNull();
            expect(window.location.reload).not.toHaveBeenCalled();
        });
    });

    describe('active step', () => {
        beforeEach(() => {
            localStorage.setItem(STORAGE_KEYS.GIST_TOKEN_WARNING_SEEN, 'true');
            localStorage.setItem(STORAGE_KEYS.GIST_TOKEN, JSON.stringify('ghp_x'));
            localStorage.setItem(STORAGE_KEYS.GIST_ID, JSON.stringify('active-gist'));
        });

        it('shows the active heading and the gist id', () => {
            renderDialog({ syncStatus: 'synced' });
            expect(screen.getByText(/Sync is active/i)).toBeInTheDocument();
            expect(screen.getByText('active-gist')).toBeInTheDocument();
        });

        it('shows the error message when syncStatus is error', () => {
            renderDialog({ syncStatus: 'error' });
            expect(screen.getByText(/Sync error/i)).toBeInTheDocument();
        });

        it('disable removes the config and triggers reload', async () => {
            const { user } = renderDialog({ syncStatus: 'synced' });
            await user.click(screen.getByRole('button', { name: /Disable sync on this device/i }));

            expect(localStorage.getItem(STORAGE_KEYS.GIST_TOKEN)).toBeNull();
            expect(localStorage.getItem(STORAGE_KEYS.GIST_ID)).toBeNull();
            expect(localStorage.getItem(STORAGE_KEYS.SYNC_UPDATED_AT)).toBeNull();
            expect(window.location.reload).toHaveBeenCalled();
        });

        it('close button calls onClose', async () => {
            const onClose = vi.fn();
            const { user } = renderDialog({ syncStatus: 'synced', onClose });
            // There are two "Close" controls — the top-right X and the bottom
            // button. Both should invoke onClose; pick the bottom one.
            const closeButtons = screen.getAllByRole('button', { name: /^Close$/i });
            await user.click(closeButtons[closeButtons.length - 1]);
            expect(onClose).toHaveBeenCalled();
        });

        it('copies gist id via clipboard and surfaces info', async () => {
            const writeText = vi
                .spyOn(navigator.clipboard, 'writeText')
                .mockResolvedValue(undefined);
            const onShowInfo = vi.fn();

            const { user } = renderDialog({ syncStatus: 'synced', onShowInfo });
            await user.click(screen.getByRole('button', { name: /Copy Gist ID/i }));

            await waitFor(() => expect(writeText).toHaveBeenCalledWith('active-gist'));
            await waitFor(() => expect(onShowInfo).toHaveBeenCalled());

            writeText.mockRestore();
        });
    });
});
