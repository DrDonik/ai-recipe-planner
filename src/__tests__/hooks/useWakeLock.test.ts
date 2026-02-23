import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWakeLock } from '@/hooks/useWakeLock';

// Helper to create a mock WakeLockSentinel
function createMockSentinel() {
    let released = false;
    const listeners: Record<string, Array<{ fn: () => void; once: boolean }>> = {};

    const sentinel = {
        get released() { return released; },
        release: vi.fn(async () => { released = true; }),
        addEventListener: vi.fn((event: string, fn: () => void, options?: { once?: boolean }) => {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push({ fn, once: options?.once ?? false });
        }),
        removeEventListener: vi.fn((event: string, fn: () => void) => {
            if (listeners[event]) {
                listeners[event] = listeners[event].filter(l => l.fn !== fn);
            }
        }),
        // Test helper: simulate the system releasing the wake lock
        _simulateRelease: () => {
            released = true;
            const releaseListeners = listeners['release'] || [];
            releaseListeners.forEach(l => l.fn());
            if (releaseListeners.length) {
                listeners['release'] = releaseListeners.filter(l => !l.once);
            }
        },
        type: 'screen' as WakeLockType,
        onrelease: null,
    };

    return sentinel;
}

describe('useWakeLock', () => {
    let mockSentinel: ReturnType<typeof createMockSentinel>;

    beforeEach(() => {
        mockSentinel = createMockSentinel();

        // Mock navigator.wakeLock
        Object.defineProperty(navigator, 'wakeLock', {
            value: {
                request: vi.fn(async () => mockSentinel),
            },
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('isSupported', () => {
        it('returns true when navigator.wakeLock is available', () => {
            const { result } = renderHook(() => useWakeLock());
            expect(result.current.isSupported).toBe(true);
        });

        it('returns false when navigator.wakeLock is not available', () => {
            // Delete wakeLock from navigator so 'wakeLock' in navigator returns false
            const nav = navigator as Record<string, unknown>;
            const original = nav['wakeLock'];
            delete nav['wakeLock'];

            const { result } = renderHook(() => useWakeLock());
            expect(result.current.isSupported).toBe(false);

            // Restore for subsequent tests
            nav['wakeLock'] = original;
        });
    });

    describe('request()', () => {
        it('sets isActive to true on successful request', async () => {
            const { result } = renderHook(() => useWakeLock());

            expect(result.current.isActive).toBe(false);

            await act(async () => {
                await result.current.request();
            });

            expect(result.current.isActive).toBe(true);
            expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');
        });

        it('attaches a release event listener to the sentinel', async () => {
            const { result } = renderHook(() => useWakeLock());

            await act(async () => {
                await result.current.request();
            });

            expect(mockSentinel.addEventListener).toHaveBeenCalledWith(
                'release',
                expect.any(Function),
                { once: true }
            );
        });

        it('sets isActive to false when request throws', async () => {
            (navigator.wakeLock.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new Error('Not allowed')
            );

            const { result } = renderHook(() => useWakeLock());

            await act(async () => {
                await result.current.request();
            });

            expect(result.current.isActive).toBe(false);
        });

        it('does not request again if already active and not released', async () => {
            const { result } = renderHook(() => useWakeLock());

            await act(async () => {
                await result.current.request();
            });

            // Request again while still active
            await act(async () => {
                await result.current.request();
            });

            expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);
        });

        it('sets isActive to false when sentinel fires release event', async () => {
            const { result } = renderHook(() => useWakeLock());

            await act(async () => {
                await result.current.request();
            });

            expect(result.current.isActive).toBe(true);

            // Simulate system releasing the wake lock (e.g., tab hidden)
            act(() => {
                mockSentinel._simulateRelease();
            });

            expect(result.current.isActive).toBe(false);
        });
    });

    describe('release()', () => {
        it('releases the sentinel and sets isActive to false', async () => {
            const { result } = renderHook(() => useWakeLock());

            await act(async () => {
                await result.current.request();
            });
            expect(result.current.isActive).toBe(true);

            await act(async () => {
                await result.current.release();
            });

            expect(result.current.isActive).toBe(false);
            expect(mockSentinel.release).toHaveBeenCalledTimes(1);
        });

        it('removes the release event listener before releasing', async () => {
            const { result } = renderHook(() => useWakeLock());

            await act(async () => {
                await result.current.request();
            });

            await act(async () => {
                await result.current.release();
            });

            expect(mockSentinel.removeEventListener).toHaveBeenCalledWith(
                'release',
                expect.any(Function)
            );
        });

        it('does not call sentinel.release() if already released', async () => {
            const { result } = renderHook(() => useWakeLock());

            await act(async () => {
                await result.current.request();
            });

            // Simulate system release first
            act(() => {
                mockSentinel._simulateRelease();
            });

            // Now user-initiated release
            await act(async () => {
                await result.current.release();
            });

            // sentinel.release() should NOT have been called because it was already released
            expect(mockSentinel.release).not.toHaveBeenCalled();
        });

        it('handles sentinel.release() throwing without crashing', async () => {
            const { result } = renderHook(() => useWakeLock());

            await act(async () => {
                await result.current.request();
            });

            mockSentinel.release.mockRejectedValueOnce(new Error('Release failed'));

            await act(async () => {
                await result.current.release();
            });

            // Should still set isActive to false despite the error
            expect(result.current.isActive).toBe(false);
        });

        it('does nothing when there is no sentinel (no prior request)', async () => {
            const { result } = renderHook(() => useWakeLock());

            // Should not throw
            await act(async () => {
                await result.current.release();
            });

            expect(result.current.isActive).toBe(false);
        });
    });

    describe('toggle()', () => {
        it('calls request() when isActive is false', async () => {
            const { result } = renderHook(() => useWakeLock());

            await act(async () => {
                result.current.toggle();
            });

            // Allow the async request to complete
            await act(async () => {});

            expect(result.current.isActive).toBe(true);
            expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);
        });

        it('calls release() when isActive is true', async () => {
            const { result } = renderHook(() => useWakeLock());

            await act(async () => {
                await result.current.request();
            });

            expect(result.current.isActive).toBe(true);

            await act(async () => {
                result.current.toggle();
            });

            await act(async () => {});

            expect(result.current.isActive).toBe(false);
            expect(mockSentinel.release).toHaveBeenCalledTimes(1);
        });
    });

    describe('visibility change re-acquisition', () => {
        it('re-acquires wake lock when tab becomes visible and user wants it active', async () => {
            const { result } = renderHook(() => useWakeLock());

            // Request the wake lock first
            await act(async () => {
                await result.current.request();
            });

            expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);

            // Simulate the system releasing it (tab hidden)
            act(() => {
                mockSentinel._simulateRelease();
            });

            expect(result.current.isActive).toBe(false);

            // Create a fresh sentinel for the re-acquisition
            const newSentinel = createMockSentinel();
            (navigator.wakeLock.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce(newSentinel);

            // Simulate tab becoming visible again
            Object.defineProperty(document, 'visibilityState', {
                value: 'visible',
                writable: true,
                configurable: true,
            });

            await act(async () => {
                document.dispatchEvent(new Event('visibilitychange'));
            });

            expect(navigator.wakeLock.request).toHaveBeenCalledTimes(2);
            expect(result.current.isActive).toBe(true);
        });

        it('does not re-acquire when user explicitly released', async () => {
            const { result } = renderHook(() => useWakeLock());

            // Request then explicitly release
            await act(async () => {
                await result.current.request();
            });

            await act(async () => {
                await result.current.release();
            });

            expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);

            // Simulate tab visibility change
            Object.defineProperty(document, 'visibilityState', {
                value: 'visible',
                writable: true,
                configurable: true,
            });

            await act(async () => {
                document.dispatchEvent(new Event('visibilitychange'));
            });

            // Should NOT re-acquire because user explicitly released
            expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);
        });

        it('does not re-acquire when tab is hidden', async () => {
            const { result } = renderHook(() => useWakeLock());

            await act(async () => {
                await result.current.request();
            });

            // Simulate tab becoming hidden (not visible)
            Object.defineProperty(document, 'visibilityState', {
                value: 'hidden',
                writable: true,
                configurable: true,
            });

            await act(async () => {
                document.dispatchEvent(new Event('visibilitychange'));
            });

            // Only the initial request
            expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);
        });
    });

    describe('unmount cleanup', () => {
        it('releases the sentinel on unmount', async () => {
            const { result, unmount } = renderHook(() => useWakeLock());

            await act(async () => {
                await result.current.request();
            });

            unmount();

            expect(mockSentinel.release).toHaveBeenCalledTimes(1);
        });

        it('removes visibility change listener on unmount', async () => {
            const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

            const { unmount } = renderHook(() => useWakeLock());

            unmount();

            const visibilityChangeCalls = removeEventListenerSpy.mock.calls.filter(
                (call: unknown[]) => call[0] === 'visibilitychange'
            );
            expect(visibilityChangeCalls.length).toBeGreaterThanOrEqual(1);

            removeEventListenerSpy.mockRestore();
        });

        it('does not call sentinel.release() if already released on unmount', async () => {
            const { result, unmount } = renderHook(() => useWakeLock());

            await act(async () => {
                await result.current.request();
            });

            // Simulate system release
            act(() => {
                mockSentinel._simulateRelease();
            });

            unmount();

            // sentinel.release() should NOT have been called by the cleanup
            expect(mockSentinel.release).not.toHaveBeenCalled();
        });

        it('handles sentinel.release() throwing during unmount without crashing', async () => {
            const { result, unmount } = renderHook(() => useWakeLock());

            await act(async () => {
                await result.current.request();
            });

            mockSentinel.release.mockImplementationOnce(async () => {
                throw new Error('Release failed during cleanup');
            });

            // Should not throw
            unmount();
        });

        it('does nothing on unmount when no sentinel was ever created', () => {
            const { unmount } = renderHook(() => useWakeLock());

            // Should not throw
            unmount();
        });
    });
});
