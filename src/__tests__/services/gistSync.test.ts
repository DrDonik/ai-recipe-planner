import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';
import { GIST_API, STORAGE_KEYS, SYNCED_STORAGE_KEYS } from '@/constants';
import {
  pullGist,
  pushGist,
  createGist,
  buildSyncPayload,
  applySyncPayload,
  GistUnauthorizedError,
  GistNotFoundError,
  GistNetworkError,
  GistPayloadError,
  SYNC_PAYLOAD_VERSION,
  type SyncPayload,
} from '@/services/gistSync';

const GIST_ID = 'abc123';
const TOKEN = 'ghp_test_token';
const GIST_URL = `${GIST_API.BASE_URL}/${GIST_ID}`;
const GISTS_URL = GIST_API.BASE_URL;

const gistResponseWith = (content: string, id: string = GIST_ID) => ({
  id,
  files: {
    [GIST_API.FILENAME]: {
      filename: GIST_API.FILENAME,
      content,
    },
  },
});

const validPayload: SyncPayload = {
  version: SYNC_PAYLOAD_VERSION,
  updatedAt: '2026-04-23T10:00:00.000Z',
  data: {
    [STORAGE_KEYS.PANTRY_ITEMS]: [{ id: 'abc', name: 'Tomato', amount: '3' }],
    [STORAGE_KEYS.SPICE_RACK]: ['salt', 'pepper'],
  },
};

const server = setupServer();

describe('gistSync service', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' });
    localStorage.clear();
  });

  afterEach(() => {
    server.resetHandlers();
    server.close();
  });

  describe('buildSyncPayload', () => {
    it('collects all present synced keys from localStorage', () => {
      localStorage.setItem(
        STORAGE_KEYS.PANTRY_ITEMS,
        JSON.stringify([{ id: 'x', name: 'Onion', amount: '2' }]),
      );
      localStorage.setItem(STORAGE_KEYS.PEOPLE_COUNT, JSON.stringify(4));

      const payload = buildSyncPayload();

      expect(payload.version).toBe(1);
      expect(typeof payload.updatedAt).toBe('string');
      expect(payload.data[STORAGE_KEYS.PANTRY_ITEMS]).toEqual([
        { id: 'x', name: 'Onion', amount: '2' },
      ]);
      expect(payload.data[STORAGE_KEYS.PEOPLE_COUNT]).toBe(4);
    });

    it('omits keys that are not present in localStorage', () => {
      localStorage.setItem(STORAGE_KEYS.PANTRY_ITEMS, JSON.stringify([]));

      const payload = buildSyncPayload();

      expect(Object.keys(payload.data)).toEqual([STORAGE_KEYS.PANTRY_ITEMS]);
    });

    it('skips keys whose stored JSON is corrupt', () => {
      localStorage.setItem(STORAGE_KEYS.PANTRY_ITEMS, '{not json');
      localStorage.setItem(STORAGE_KEYS.PEOPLE_COUNT, JSON.stringify(2));

      const payload = buildSyncPayload();

      expect(payload.data[STORAGE_KEYS.PANTRY_ITEMS]).toBeUndefined();
      expect(payload.data[STORAGE_KEYS.PEOPLE_COUNT]).toBe(2);
    });

    it('produces a fresh ISO timestamp', () => {
      const before = Date.now();
      const payload = buildSyncPayload();
      const after = Date.now();
      const ts = Date.parse(payload.updatedAt);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('does NOT export device-local keys', () => {
      // Sanity check: ensure the exported set does not leak device-local state
      expect(SYNCED_STORAGE_KEYS).not.toContain(STORAGE_KEYS.API_KEY);
      expect(SYNCED_STORAGE_KEYS).not.toContain(STORAGE_KEYS.LANGUAGE);
      expect(SYNCED_STORAGE_KEYS).not.toContain(STORAGE_KEYS.HEADER_MINIMIZED);
      expect(SYNCED_STORAGE_KEYS).not.toContain(STORAGE_KEYS.WELCOME_DISMISSED);
    });
  });

  describe('applySyncPayload', () => {
    it('writes all provided keys to localStorage', () => {
      applySyncPayload(validPayload);

      expect(localStorage.getItem(STORAGE_KEYS.PANTRY_ITEMS)).toBe(
        JSON.stringify([{ id: 'abc', name: 'Tomato', amount: '3' }]),
      );
      expect(localStorage.getItem(STORAGE_KEYS.SPICE_RACK)).toBe(
        JSON.stringify(['salt', 'pepper']),
      );
    });

    it('removes synced keys that are absent from the payload', () => {
      localStorage.setItem(STORAGE_KEYS.PANTRY_ITEMS, JSON.stringify([{ id: 'old', name: 'x', amount: '1' }]));
      localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify({ recipes: [], shoppingList: [] }));

      applySyncPayload({
        version: 1,
        updatedAt: '2026-04-23T10:00:00.000Z',
        data: {
          [STORAGE_KEYS.PANTRY_ITEMS]: [{ id: 'new', name: 'y', amount: '2' }],
        },
      });

      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PANTRY_ITEMS)!)).toEqual([
        { id: 'new', name: 'y', amount: '2' },
      ]);
      expect(localStorage.getItem(STORAGE_KEYS.MEAL_PLAN)).toBeNull();
    });

    it('does NOT touch device-local keys', () => {
      localStorage.setItem(STORAGE_KEYS.API_KEY, JSON.stringify('secret-key'));
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, JSON.stringify('German'));
      localStorage.setItem(STORAGE_KEYS.HEADER_MINIMIZED, JSON.stringify(true));

      applySyncPayload(validPayload);

      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.API_KEY)!)).toBe('secret-key');
      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.LANGUAGE)!)).toBe('German');
      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.HEADER_MINIMIZED)!)).toBe(true);
    });
  });

  describe('pullGist', () => {
    it('returns the parsed payload on success', async () => {
      server.use(
        http.get(GIST_URL, ({ request }) => {
          expect(request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
          return HttpResponse.json(gistResponseWith(JSON.stringify(validPayload)));
        }),
      );

      const result = await pullGist(TOKEN, GIST_ID);
      expect(result).toEqual(validPayload);
    });

    it('returns null when the Gist exists but lacks the sync file', async () => {
      server.use(
        http.get(GIST_URL, () =>
          HttpResponse.json({ id: GIST_ID, files: { 'other.txt': { content: 'hi' } } }),
        ),
      );

      const result = await pullGist(TOKEN, GIST_ID);
      expect(result).toBeNull();
    });

    it('throws GistUnauthorizedError on 401', async () => {
      server.use(http.get(GIST_URL, () => new HttpResponse(null, { status: 401 })));
      await expect(pullGist(TOKEN, GIST_ID)).rejects.toBeInstanceOf(GistUnauthorizedError);
    });

    it('throws GistUnauthorizedError on 403', async () => {
      server.use(http.get(GIST_URL, () => new HttpResponse(null, { status: 403 })));
      await expect(pullGist(TOKEN, GIST_ID)).rejects.toBeInstanceOf(GistUnauthorizedError);
    });

    it('throws GistNotFoundError on 404', async () => {
      server.use(http.get(GIST_URL, () => new HttpResponse(null, { status: 404 })));
      await expect(pullGist(TOKEN, GIST_ID)).rejects.toBeInstanceOf(GistNotFoundError);
    });

    it('throws GistNetworkError on generic failure status', async () => {
      server.use(http.get(GIST_URL, () => new HttpResponse(null, { status: 500 })));
      await expect(pullGist(TOKEN, GIST_ID)).rejects.toBeInstanceOf(GistNetworkError);
    });

    it('throws GistNetworkError when the request itself fails', async () => {
      server.use(http.get(GIST_URL, () => HttpResponse.error()));
      await expect(pullGist(TOKEN, GIST_ID)).rejects.toBeInstanceOf(GistNetworkError);
    });

    it('throws GistPayloadError when file content is not valid JSON', async () => {
      server.use(
        http.get(GIST_URL, () => HttpResponse.json(gistResponseWith('definitely not json'))),
      );
      await expect(pullGist(TOKEN, GIST_ID)).rejects.toBeInstanceOf(GistPayloadError);
    });

    it('throws GistPayloadError when content does not match schema', async () => {
      server.use(
        http.get(GIST_URL, () => HttpResponse.json(gistResponseWith(JSON.stringify({ foo: 'bar' })))),
      );
      await expect(pullGist(TOKEN, GIST_ID)).rejects.toBeInstanceOf(GistPayloadError);
    });

    it('fetches truncated content via raw_url with the Authorization header', async () => {
      // Gists are private (public: false on create), so raw_url requires auth.
      const RAW_URL = 'https://gist.githubusercontent.com/fake-user/abc123/raw/sync.json';
      let rawAuth: string | null = null;

      server.use(
        http.get(GIST_URL, () =>
          HttpResponse.json({
            id: GIST_ID,
            files: {
              [GIST_API.FILENAME]: {
                filename: GIST_API.FILENAME,
                // Simulate GitHub truncating the content and exposing raw_url.
                content: '',
                truncated: true,
                raw_url: RAW_URL,
              },
            },
          }),
        ),
        http.get(RAW_URL, ({ request }) => {
          rawAuth = request.headers.get('Authorization');
          return new HttpResponse(JSON.stringify(validPayload), {
            headers: { 'Content-Type': 'application/json' },
          });
        }),
      );

      const result = await pullGist(TOKEN, GIST_ID);
      expect(result).toEqual(validPayload);
      expect(rawAuth).toBe(`Bearer ${TOKEN}`);
    });

    it('wraps raw_url failures as GistNetworkError', async () => {
      const RAW_URL = 'https://gist.githubusercontent.com/fake-user/abc123/raw/sync.json';
      server.use(
        http.get(GIST_URL, () =>
          HttpResponse.json({
            id: GIST_ID,
            files: {
              [GIST_API.FILENAME]: {
                filename: GIST_API.FILENAME,
                content: '',
                truncated: true,
                raw_url: RAW_URL,
              },
            },
          }),
        ),
        http.get(RAW_URL, () => new HttpResponse(null, { status: 500 })),
      );

      await expect(pullGist(TOKEN, GIST_ID)).rejects.toBeInstanceOf(GistNetworkError);
    });

    it('honors the timeout by aborting slow requests', async () => {
      vi.useFakeTimers();
      server.use(
        http.get(GIST_URL, async () => {
          await delay(GIST_API.TIMEOUT_MS + 5_000);
          return HttpResponse.json(gistResponseWith(JSON.stringify(validPayload)));
        }),
      );

      const promise = pullGist(TOKEN, GIST_ID);
      // Attach a catch synchronously so the rejection is never "unhandled"
      // while fake timers advance. The actual assertion happens below.
      const settled = promise.catch((err) => err);
      await vi.advanceTimersByTimeAsync(GIST_API.TIMEOUT_MS + 100);
      const err = await settled;
      expect(err).toBeInstanceOf(GistNetworkError);
      vi.useRealTimers();
    });
  });

  describe('pushGist', () => {
    it('sends a PATCH with the payload in the sync file', async () => {
      const received: { body: unknown; auth: string | null } = { body: null, auth: null };
      server.use(
        http.patch(GIST_URL, async ({ request }) => {
          received.auth = request.headers.get('Authorization');
          received.body = await request.json();
          return HttpResponse.json({ id: GIST_ID, files: {} });
        }),
      );

      await pushGist(TOKEN, GIST_ID, validPayload);

      expect(received.auth).toBe(`Bearer ${TOKEN}`);
      const body = received.body as { files: Record<string, { content: string }> };
      expect(body.files[GIST_API.FILENAME]).toBeDefined();
      const parsed = JSON.parse(body.files[GIST_API.FILENAME].content);
      expect(parsed).toEqual(validPayload);
    });

    it('throws GistUnauthorizedError on 401', async () => {
      server.use(http.patch(GIST_URL, () => new HttpResponse(null, { status: 401 })));
      await expect(pushGist(TOKEN, GIST_ID, validPayload)).rejects.toBeInstanceOf(
        GistUnauthorizedError,
      );
    });

    it('throws GistNotFoundError on 404', async () => {
      server.use(http.patch(GIST_URL, () => new HttpResponse(null, { status: 404 })));
      await expect(pushGist(TOKEN, GIST_ID, validPayload)).rejects.toBeInstanceOf(
        GistNotFoundError,
      );
    });
  });

  describe('createGist', () => {
    it('POSTs a private gist and returns the new id', async () => {
      const received: { body: unknown } = { body: null };
      server.use(
        http.post(GISTS_URL, async ({ request }) => {
          received.body = await request.json();
          return HttpResponse.json({ id: 'newid42', files: {} });
        }),
      );

      const id = await createGist(TOKEN, validPayload);

      expect(id).toBe('newid42');
      const body = received.body as {
        public: boolean;
        files: Record<string, { content: string }>;
      };
      expect(body.public).toBe(false);
      expect(body.files[GIST_API.FILENAME]).toBeDefined();
    });

    it('throws GistPayloadError if GitHub omits the id field', async () => {
      server.use(http.post(GISTS_URL, () => HttpResponse.json({ files: {} })));
      await expect(createGist(TOKEN, validPayload)).rejects.toBeInstanceOf(GistPayloadError);
    });

    it('throws GistUnauthorizedError on 401', async () => {
      server.use(http.post(GISTS_URL, () => new HttpResponse(null, { status: 401 })));
      await expect(createGist(TOKEN, validPayload)).rejects.toBeInstanceOf(
        GistUnauthorizedError,
      );
    });
  });
});
