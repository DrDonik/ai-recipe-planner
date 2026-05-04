import { z } from 'zod';
import { GIST_API, SYNCED_STORAGE_KEYS } from '../constants';
import { writeLocalStorageExternal } from '../hooks/useLocalStorage';

/**
 * Shape of the payload stored in the sync Gist.
 * `data` is a bag of stringified-then-parsed localStorage values, keyed by
 * their STORAGE_KEYS entry. Individual value types are intentionally loose —
 * each consumer re-parses on read.
 */
export const SyncPayloadSchema = z.object({
    version: z.literal(1),
    updatedAt: z.string(),
    data: z.record(z.string(), z.unknown()),
});

export type SyncPayload = z.infer<typeof SyncPayloadSchema>;

export const SYNC_PAYLOAD_VERSION = 1;

/**
 * Error types the sync service can raise. The hook/UI layer maps these to
 * translated user-facing messages.
 */
export class GistUnauthorizedError extends Error {
    constructor(message = 'Gist token is unauthorized or invalid') {
        super(message);
        this.name = 'GistUnauthorizedError';
    }
}

export class GistNotFoundError extends Error {
    constructor(message = 'Gist not found') {
        super(message);
        this.name = 'GistNotFoundError';
    }
}

export class GistNetworkError extends Error {
    constructor(message = 'Network error communicating with GitHub') {
        super(message);
        this.name = 'GistNetworkError';
    }
}

export class GistPayloadError extends Error {
    constructor(message = 'Gist payload is malformed') {
        super(message);
        this.name = 'GistPayloadError';
    }
}

/**
 * Builds a sync payload from the currently persisted localStorage values.
 * Keys with no localStorage entry are omitted.
 */
export const buildSyncPayload = (): SyncPayload => {
    const data: Record<string, unknown> = {};

    for (const key of SYNCED_STORAGE_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw === null) continue;
        try {
            data[key] = JSON.parse(raw);
        } catch {
            // Skip corrupt entries rather than failing the whole push.
            continue;
        }
    }

    return {
        version: SYNC_PAYLOAD_VERSION,
        updatedAt: new Date().toISOString(),
        data,
    };
};

/**
 * Applies a sync payload to localStorage, overwriting any synced keys.
 * Keys absent from the payload are removed locally (matches import semantics).
 *
 * Writes go through `writeLocalStorageExternal` so that mounted
 * `useLocalStorage` hooks re-read the new values and React re-renders the UI.
 * Without this, the page would still show the pre-sync state until reload.
 */
export const applySyncPayload = (payload: SyncPayload): void => {
    for (const key of SYNCED_STORAGE_KEYS) {
        // `undefined` (key absent from payload) removes the local key, which
        // tells subscribed useLocalStorage hooks to reset to their initial
        // value. Any present value (including `null`) is written verbatim.
        writeLocalStorageExternal(key, payload.data[key]);
    }
};

/**
 * Common fetch wrapper: timeout + GitHub auth + status-to-error mapping.
 */
const gistFetch = async (
    url: string,
    init: RequestInit,
    token: string,
): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GIST_API.TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch(url, {
            ...init,
            signal: controller.signal,
            headers: {
                ...init.headers,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                Authorization: `Bearer ${token}`,
            },
        });
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            throw new GistNetworkError('Request to GitHub timed out');
        }
        throw new GistNetworkError(err instanceof Error ? err.message : String(err));
    } finally {
        clearTimeout(timeoutId);
    }

    if (response.status === 401 || response.status === 403) {
        throw new GistUnauthorizedError();
    }
    if (response.status === 404) {
        throw new GistNotFoundError();
    }
    if (!response.ok) {
        throw new GistNetworkError(`GitHub responded with status ${response.status}`);
    }

    return response;
};

interface GistFileResponse {
    content?: string;
    truncated?: boolean;
    raw_url?: string;
}

interface GistResponse {
    id: string;
    files: Record<string, GistFileResponse | undefined>;
}

/**
 * Parses a Gist response and extracts our payload file. Returns null if the
 * Gist exists but does not contain our file (e.g. empty or unrelated Gist).
 *
 * The token is required because our gists are private (see `createGist`), and
 * GitHub requires authentication to fetch `raw_url` for private gist files.
 */
const extractPayload = async (
    gist: GistResponse,
    token: string,
): Promise<SyncPayload | null> => {
    const file = gist.files[GIST_API.FILENAME];
    if (!file) return null;

    let content = file.content ?? '';
    if (file.truncated && file.raw_url) {
        const raw = await gistFetch(file.raw_url, { method: 'GET' }, token);
        content = await raw.text();
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(content);
    } catch {
        throw new GistPayloadError('Gist content is not valid JSON');
    }

    const result = SyncPayloadSchema.safeParse(parsed);
    if (!result.success) {
        throw new GistPayloadError('Gist content does not match sync schema');
    }
    return result.data;
};

/**
 * Fetches and parses a Gist by ID. Returns null if the Gist exists but does
 * not yet contain a sync payload file.
 */
export const pullGist = async (
    token: string,
    gistId: string,
): Promise<SyncPayload | null> => {
    const response = await gistFetch(`${GIST_API.BASE_URL}/${gistId}`, { method: 'GET' }, token);
    const gist = (await response.json()) as GistResponse;
    return extractPayload(gist, token);
};

/**
 * Overwrites the payload file in the given Gist.
 */
export const pushGist = async (
    token: string,
    gistId: string,
    payload: SyncPayload,
): Promise<void> => {
    await gistFetch(
        `${GIST_API.BASE_URL}/${gistId}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                files: {
                    [GIST_API.FILENAME]: {
                        content: JSON.stringify(payload, null, 2),
                    },
                },
            }),
        },
        token,
    );
};

/**
 * Creates a new private Gist with the given payload. Returns the new Gist ID.
 */
export const createGist = async (
    token: string,
    payload: SyncPayload,
): Promise<string> => {
    const response = await gistFetch(
        GIST_API.BASE_URL,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                description: 'AI Recipe Planner sync',
                public: false,
                files: {
                    [GIST_API.FILENAME]: {
                        content: JSON.stringify(payload, null, 2),
                    },
                },
            }),
        },
        token,
    );
    const gist = (await response.json()) as GistResponse;
    if (!gist.id) {
        throw new GistPayloadError('GitHub response missing gist id');
    }
    return gist.id;
};
