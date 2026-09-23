import { useEffect, useRef, useState } from 'react';
import { GIST_API, STORAGE_KEYS, SYNCED_STORAGE_KEYS } from '../constants';
import {
    applySyncPayload,
    buildSyncPayload,
    GistNetworkError,
    GistNotFoundError,
    GistPayloadError,
    GistUnauthorizedError,
    pullGist,
    pushGist,
    readActiveSyncConfig,
} from '../services/gistSync';
import { subscribeToLocalStorageChanges } from './useLocalStorage';

export type SyncStatus = 'idle' | 'pulling' | 'synced' | 'pending' | 'pushing' | 'error';

export type SyncErrorKind = 'unauthorized' | 'notFound' | 'payload' | 'network';

export interface UseGistSyncResult {
    /**
     * Current sync status. `idle` when sync is not configured.
     */
    status: SyncStatus;
    /**
     * Categorised error kind when `status === 'error'`, otherwise null.
     */
    errorKind: SyncErrorKind | null;
    /**
     * Whether sync is configured (token + gistId both present).
     */
    isConfigured: boolean;
    /**
     * Signals that the initial pull completed and the remote state (if any)
     * has been applied. Consumers may show a one-time notification.
     */
    justPulledFromRemote: boolean;
    /**
     * Clears the `justPulledFromRemote` flag after it has been consumed.
     */
    acknowledgePull: () => void;
}

const classifyError = (err: unknown): SyncErrorKind => {
    if (err instanceof GistUnauthorizedError) return 'unauthorized';
    if (err instanceof GistNotFoundError) return 'notFound';
    if (err instanceof GistPayloadError) return 'payload';
    return 'network';
};

/** Backoff before each automatic retry; the last delay repeats. */
const RETRY_DELAYS_MS = [5_000, 15_000, 60_000, 300_000];

/**
 * Re-runs a sync step that failed on the network: on a backoff, or at once
 * when the browser reports it is back online or the app becomes visible again.
 * Holds one step at a time; a new failure replaces the pending one. The
 * visibility trigger matters on iPadOS, which suspends timers while a PWA sits
 * in the background: without it a resumed app would still wait out the rest of
 * a backoff of up to five minutes.
 */
const createRetrier = () => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending: (() => void) | null = null;
    let attempt = 0;

    const cancel = () => {
        if (timer) clearTimeout(timer);
        timer = null;
        pending = null;
    };
    const fire = () => {
        const step = pending;
        cancel();
        step?.();
    };

    return {
        schedule: (step: () => void) => {
            cancel();
            pending = step;
            timer = setTimeout(fire, RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
            attempt++;
        },
        succeeded: () => {
            cancel();
            attempt = 0;
        },
        fireNow: () => {
            if (pending) fire();
        },
        cancel,
    };
};

/**
 * Orchestrates Gist-based sync for the app:
 *
 * 1. On mount, pulls the remote payload. If it exists, applies it to
 *    localStorage (remote always wins on page load).
 * 2. After the initial pull succeeds, subscribes to localStorage change
 *    events and pushes a debounced snapshot whenever a synced key changes.
 *
 * Each page load pulls until one pull succeeds, and never pushes before it
 * has: a push is a full snapshot, so pushing without having pulled would
 * overwrite whatever another device stored since. A step that fails in
 * transport (GistNetworkError: unreachable, timed out, a 5xx) is retried (see
 * createRetrier); anything else needs the user or a fix and is not. Retries run quietly — status stays `error` until one succeeds,
 * so a failure that persists is not re-announced on every attempt. Pushes are
 * debounced by GIST_API.PUSH_DEBOUNCE_MS to coalesce rapid edits.
 */
export const useGistSync = (): UseGistSyncResult => {
    // Null while sync is switched off, so a token kept on this device sits
    // unused rather than quietly syncing on.
    const config = readActiveSyncConfig();
    const isConfigured = config !== null;

    const [status, setStatus] = useState<SyncStatus>(isConfigured ? 'pulling' : 'idle');
    const [errorKind, setErrorKind] = useState<SyncErrorKind | null>(null);
    const [justPulledFromRemote, setJustPulledFromRemote] = useState(false);

    // The initial pull must succeed before we start pushing, otherwise we
    // race the applySyncPayload writes and push what we just pulled — or,
    // after a failed pull, push a stale snapshot over the remote.
    const pullCompleteRef = useRef(false);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pushInFlightRef = useRef(false);
    const pushQueuedRef = useRef(false);
    const [retrier] = useState(createRetrier);

    // Pull on mount, retrying on network errors until one succeeds. The effect
    // reads its own config to avoid a stale closure if the hook ever receives
    // config via props.
    useEffect(() => {
        const cfg = readActiveSyncConfig();
        if (!cfg) {
            pullCompleteRef.current = true;
            return;
        }

        let cancelled = false;
        // Another tab can switch sync off or to another Gist while a retry
        // waits; a stale retry must neither apply the old Gist nor unlock
        // pushes, which read the new config.
        const configIsCurrent = () => {
            const current = readActiveSyncConfig();
            return current?.token === cfg.token && current.gistId === cfg.gistId;
        };
        const pull = async () => {
            if (!configIsCurrent()) return;
            try {
                const remote = await pullGist(cfg.token, cfg.gistId);
                if (cancelled || !configIsCurrent()) return;
                if (remote) {
                    applySyncPayload(remote);
                    localStorage.setItem(
                        STORAGE_KEYS.SYNC_UPDATED_AT,
                        JSON.stringify(remote.updatedAt),
                    );
                    setJustPulledFromRemote(true);
                }
                pullCompleteRef.current = true;
                retrier.succeeded();
                setStatus('synced');
                setErrorKind(null);
            } catch (err) {
                if (cancelled || !configIsCurrent()) return;
                setStatus('error');
                setErrorKind(classifyError(err));
                if (err instanceof GistNetworkError) retrier.schedule(pull);
            }
        };
        pull();

        return () => {
            cancelled = true;
        };
    }, [retrier]);

    // Debounced push on synced-key changes. Subscribes only after the pull
    // completes, so applySyncPayload writes do not trigger a push.
    useEffect(() => {
        if (!isConfigured) return;
        let active = true;

        const performPush = async (isRetry = false) => {
            if (!active) return;
            const cfg = readActiveSyncConfig();
            if (!cfg) return;

            if (pushInFlightRef.current) {
                // Coalesce: another push is active, mark another one queued.
                pushQueuedRef.current = true;
                return;
            }

            pushInFlightRef.current = true;
            if (!isRetry) setStatus('pushing');
            try {
                const payload = buildSyncPayload();
                await pushGist(cfg.token, cfg.gistId, payload);
                if (!active) return;
                localStorage.setItem(
                    STORAGE_KEYS.SYNC_UPDATED_AT,
                    JSON.stringify(payload.updatedAt),
                );
                retrier.succeeded();
                setStatus('synced');
                setErrorKind(null);
            } catch (err) {
                if (!active) return;
                setStatus('error');
                setErrorKind(classifyError(err));
                if (err instanceof GistNetworkError) retrier.schedule(() => performPush(true));
            } finally {
                pushInFlightRef.current = false;
                if (active && pushQueuedRef.current) {
                    pushQueuedRef.current = false;
                    performPush();
                }
            }
        };

        const unsubscribe = subscribeToLocalStorageChanges(({ key, source }) => {
            if (!pullCompleteRef.current) return;
            // External writes (e.g. our own applySyncPayload) must not trigger
            // a push — that would echo the value we just pulled back to the gist.
            if (source !== 'internal') return;
            if (!SYNCED_STORAGE_KEYS.includes(key)) return;

            setStatus('pending');
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
                debounceTimerRef.current = null;
                performPush();
            }, GIST_API.PUSH_DEBOUNCE_MS);
        });

        return () => {
            active = false;
            unsubscribe();
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
        };
    }, [isConfigured, retrier]);

    // Coming back online or back into view is the likeliest moment for a retry
    // to succeed, so a pending one does not wait out its backoff. Neither event
    // starts a sync on its own: without a pending retry, fireNow does nothing.
    useEffect(() => {
        if (!isConfigured) return;
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') retrier.fireNow();
        };
        window.addEventListener('online', retrier.fireNow);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('online', retrier.fireNow);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            retrier.cancel();
        };
    }, [isConfigured, retrier]);

    return {
        status,
        errorKind,
        isConfigured,
        justPulledFromRemote,
        acknowledgePull: () => setJustPulledFromRemote(false),
    };
};
