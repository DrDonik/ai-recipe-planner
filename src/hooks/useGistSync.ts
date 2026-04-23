import { useEffect, useRef, useState } from 'react';
import { GIST_API, STORAGE_KEYS, SYNCED_STORAGE_KEYS } from '../constants';
import {
    applySyncPayload,
    buildSyncPayload,
    GistNotFoundError,
    GistPayloadError,
    GistUnauthorizedError,
    pullGist,
    pushGist,
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

const readConfig = () => {
    const rawToken = localStorage.getItem(STORAGE_KEYS.GIST_TOKEN);
    const rawId = localStorage.getItem(STORAGE_KEYS.GIST_ID);
    if (!rawToken || !rawId) return null;
    try {
        const token = JSON.parse(rawToken);
        const gistId = JSON.parse(rawId);
        if (typeof token !== 'string' || typeof gistId !== 'string' || !token || !gistId) {
            return null;
        }
        return { token, gistId };
    } catch {
        return null;
    }
};

/**
 * Orchestrates Gist-based sync for the app:
 *
 * 1. On mount, pulls the remote payload. If it exists, applies it to
 *    localStorage (remote always wins on page load).
 * 2. After the initial pull completes, subscribes to localStorage change
 *    events and pushes a debounced snapshot whenever a synced key changes.
 *
 * Each page load triggers at most one pull. Pushes are debounced by
 * GIST_API.PUSH_DEBOUNCE_MS to coalesce rapid edits.
 */
export const useGistSync = (): UseGistSyncResult => {
    const config = readConfig();
    const isConfigured = config !== null;

    const [status, setStatus] = useState<SyncStatus>(isConfigured ? 'pulling' : 'idle');
    const [errorKind, setErrorKind] = useState<SyncErrorKind | null>(null);
    const [justPulledFromRemote, setJustPulledFromRemote] = useState(false);

    // The initial pull must complete before we start pushing, otherwise we
    // race the applySyncPayload writes and push what we just pulled.
    const pullCompleteRef = useRef(false);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pushInFlightRef = useRef(false);
    const pushQueuedRef = useRef(false);

    // Run pull exactly once on mount. The effect reads its own config to
    // avoid a stale closure if the hook ever receives config via props.
    useEffect(() => {
        const cfg = readConfig();
        if (!cfg) {
            pullCompleteRef.current = true;
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const remote = await pullGist(cfg.token, cfg.gistId);
                if (cancelled) return;
                if (remote) {
                    applySyncPayload(remote);
                    localStorage.setItem(
                        STORAGE_KEYS.SYNC_UPDATED_AT,
                        JSON.stringify(remote.updatedAt),
                    );
                    setJustPulledFromRemote(true);
                }
                setStatus('synced');
                setErrorKind(null);
            } catch (err) {
                if (cancelled) return;
                setStatus('error');
                setErrorKind(classifyError(err));
            } finally {
                if (!cancelled) {
                    pullCompleteRef.current = true;
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    // Debounced push on synced-key changes. Subscribes only after the pull
    // completes, so applySyncPayload writes do not trigger a push.
    useEffect(() => {
        if (!isConfigured) return;

        const performPush = async () => {
            const cfg = readConfig();
            if (!cfg) return;

            if (pushInFlightRef.current) {
                // Coalesce: another push is active, mark another one queued.
                pushQueuedRef.current = true;
                return;
            }

            pushInFlightRef.current = true;
            setStatus('pushing');
            try {
                const payload = buildSyncPayload();
                await pushGist(cfg.token, cfg.gistId, payload);
                localStorage.setItem(
                    STORAGE_KEYS.SYNC_UPDATED_AT,
                    JSON.stringify(payload.updatedAt),
                );
                setStatus('synced');
                setErrorKind(null);
            } catch (err) {
                setStatus('error');
                setErrorKind(classifyError(err));
            } finally {
                pushInFlightRef.current = false;
                if (pushQueuedRef.current) {
                    pushQueuedRef.current = false;
                    performPush();
                }
            }
        };

        const unsubscribe = subscribeToLocalStorageChanges(({ key }) => {
            if (!pullCompleteRef.current) return;
            if (!SYNCED_STORAGE_KEYS.includes(key)) return;

            setStatus('pending');
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
                debounceTimerRef.current = null;
                performPush();
            }, GIST_API.PUSH_DEBOUNCE_MS);
        });

        return () => {
            unsubscribe();
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
        };
    }, [isConfigured]);

    return {
        status,
        errorKind,
        isConfigured,
        justPulledFromRemote,
        acknowledgePull: () => setJustPulledFromRemote(false),
    };
};
