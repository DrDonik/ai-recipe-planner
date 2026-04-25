import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { GIST_API, STORAGE_KEYS } from '@/constants';
import { useGistSync } from '@/hooks/useGistSync';
import { SYNC_PAYLOAD_VERSION, type SyncPayload } from '@/services/gistSync';

const TOKEN = 'ghp_abc';
const GIST_ID = 'gist123';
const GIST_URL = `${GIST_API.BASE_URL}/${GIST_ID}`;

const configureSync = () => {
  localStorage.setItem(STORAGE_KEYS.GIST_TOKEN, JSON.stringify(TOKEN));
  localStorage.setItem(STORAGE_KEYS.GIST_ID, JSON.stringify(GIST_ID));
};

const makeRemotePayload = (overrides: Partial<SyncPayload> = {}): SyncPayload => ({
  version: SYNC_PAYLOAD_VERSION,
  updatedAt: '2026-04-23T12:00:00.000Z',
  data: {
    [STORAGE_KEYS.PANTRY_ITEMS]: [{ id: 'r1', name: 'RemoteItem', amount: '1' }],
    [STORAGE_KEYS.PEOPLE_COUNT]: 5,
  },
  ...overrides,
});

const gistWithPayload = (payload: SyncPayload) => ({
  id: GIST_ID,
  files: {
    [GIST_API.FILENAME]: {
      filename: GIST_API.FILENAME,
      content: JSON.stringify(payload),
    },
  },
});

const server = setupServer();

describe('useGistSync', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' });
    localStorage.clear();
  });

  afterEach(() => {
    server.resetHandlers();
    server.close();
    vi.useRealTimers();
  });

  it('stays idle when sync is not configured and does not hit the network', async () => {
    const networkSpy = vi.fn();
    server.use(
      http.get(GIST_URL, () => {
        networkSpy();
        return HttpResponse.json({});
      }),
    );

    const { result } = renderHook(() => useGistSync());

    expect(result.current.isConfigured).toBe(false);
    expect(result.current.status).toBe('idle');
    // Give microtasks a chance
    await new Promise((r) => setTimeout(r, 0));
    expect(networkSpy).not.toHaveBeenCalled();
  });

  it('pulls on mount, applies payload, and sets status to synced', async () => {
    configureSync();
    const remote = makeRemotePayload();
    server.use(http.get(GIST_URL, () => HttpResponse.json(gistWithPayload(remote))));

    const { result } = renderHook(() => useGistSync());

    expect(result.current.status).toBe('pulling');

    await waitFor(() => expect(result.current.status).toBe('synced'));
    expect(result.current.justPulledFromRemote).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PANTRY_ITEMS)!)).toEqual([
      { id: 'r1', name: 'RemoteItem', amount: '1' },
    ]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PEOPLE_COUNT)!)).toBe(5);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.SYNC_UPDATED_AT)!)).toBe(remote.updatedAt);
  });

  it('does not flag justPulledFromRemote if the gist has no sync file yet', async () => {
    configureSync();
    server.use(
      http.get(GIST_URL, () =>
        HttpResponse.json({ id: GIST_ID, files: { 'other.txt': { content: '' } } }),
      ),
    );

    const { result } = renderHook(() => useGistSync());

    await waitFor(() => expect(result.current.status).toBe('synced'));
    expect(result.current.justPulledFromRemote).toBe(false);
  });

  it('enters error state with unauthorized on 401', async () => {
    configureSync();
    server.use(http.get(GIST_URL, () => new HttpResponse(null, { status: 401 })));

    const { result } = renderHook(() => useGistSync());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorKind).toBe('unauthorized');
  });

  it('enters error state with notFound on 404', async () => {
    configureSync();
    server.use(http.get(GIST_URL, () => new HttpResponse(null, { status: 404 })));

    const { result } = renderHook(() => useGistSync());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorKind).toBe('notFound');
  });

  it('leaves localStorage untouched on pull error', async () => {
    configureSync();
    localStorage.setItem(STORAGE_KEYS.PANTRY_ITEMS, JSON.stringify([{ id: 'keep', name: 'Keep', amount: '1' }]));
    server.use(http.get(GIST_URL, () => HttpResponse.error()));

    const { result } = renderHook(() => useGistSync());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PANTRY_ITEMS)!)).toEqual([
      { id: 'keep', name: 'Keep', amount: '1' },
    ]);
  });

  it('pushes a debounced payload when useLocalStorage writes a synced key', async () => {
    configureSync();
    const remote = makeRemotePayload({ data: {} });
    let patchCount = 0;
    let lastPatchedContent: string | null = null;

    server.use(
      http.get(GIST_URL, () => HttpResponse.json(gistWithPayload(remote))),
      http.patch(GIST_URL, async ({ request }) => {
        patchCount++;
        const body = (await request.json()) as {
          files: Record<string, { content: string }>;
        };
        lastPatchedContent = body.files[GIST_API.FILENAME].content;
        return HttpResponse.json({ id: GIST_ID, files: {} });
      }),
    );

    const { result: syncResult } = renderHook(() => useGistSync());
    await waitFor(() => expect(syncResult.current.status).toBe('synced'));

    // Write to a synced key via the real useLocalStorage hook, which emits
    // the change event that useGistSync listens for.
    const { useLocalStorage } = await import('@/hooks/useLocalStorage');
    const { result: lsResult } = renderHook(() =>
      useLocalStorage<string[]>(STORAGE_KEYS.SPICE_RACK, []),
    );

    await act(async () => {
      lsResult.current[1](['salt']);
    });

    // Wait past the debounce window and the subsequent push.
    await waitFor(
      () => expect(patchCount).toBeGreaterThanOrEqual(1),
      { timeout: GIST_API.PUSH_DEBOUNCE_MS + 3000 },
    );

    expect(patchCount).toBe(1);
    const pushed = JSON.parse(lastPatchedContent!);
    expect(pushed.data[STORAGE_KEYS.SPICE_RACK]).toEqual(['salt']);
    await waitFor(() => expect(syncResult.current.status).toBe('synced'));
  });

  it('does not push for writes to device-local keys', async () => {
    configureSync();
    const remote = makeRemotePayload({ data: {} });
    const patchSpy = vi.fn();

    server.use(
      http.get(GIST_URL, () => HttpResponse.json(gistWithPayload(remote))),
      http.patch(GIST_URL, () => {
        patchSpy();
        return HttpResponse.json({ id: GIST_ID, files: {} });
      }),
    );

    const { result: syncResult } = renderHook(() => useGistSync());
    await waitFor(() => expect(syncResult.current.status).toBe('synced'));

    const { useLocalStorage } = await import('@/hooks/useLocalStorage');
    const { result: lsResult } = renderHook(() =>
      useLocalStorage<boolean>(STORAGE_KEYS.HEADER_MINIMIZED, false),
    );

    await act(async () => {
      lsResult.current[1](true);
    });

    // Wait longer than the debounce to be sure no push is ever scheduled.
    await new Promise((r) => setTimeout(r, GIST_API.PUSH_DEBOUNCE_MS + 500));
    expect(patchSpy).not.toHaveBeenCalled();
  });

  it('does not push as a result of applying the initial pull', async () => {
    configureSync();
    const remote = makeRemotePayload();
    const patchSpy = vi.fn();

    server.use(
      http.get(GIST_URL, () => HttpResponse.json(gistWithPayload(remote))),
      http.patch(GIST_URL, () => {
        patchSpy();
        return HttpResponse.json({ id: GIST_ID, files: {} });
      }),
    );

    const { result } = renderHook(() => useGistSync());
    await waitFor(() => expect(result.current.status).toBe('synced'));

    // Even after the debounce window, no push should have been fired for
    // the applySyncPayload writes.
    await new Promise((r) => setTimeout(r, GIST_API.PUSH_DEBOUNCE_MS + 500));
    expect(patchSpy).not.toHaveBeenCalled();
  });

  it('updates a mounted useLocalStorage hook with the pulled value (no reload required)', async () => {
    // Regression test for the bug where applySyncPayload wrote directly to
    // localStorage but mounted useLocalStorage hooks kept showing stale state
    // (e.g. deleted recipes/ingredients still visible until manual reload).
    configureSync();
    const remote = makeRemotePayload();
    const patchSpy = vi.fn();
    server.use(
      http.get(GIST_URL, () => HttpResponse.json(gistWithPayload(remote))),
      http.patch(GIST_URL, () => {
        patchSpy();
        return HttpResponse.json({ id: GIST_ID, files: {} });
      }),
    );

    // Pre-populate local state so the hook starts with something different
    // from the incoming remote payload.
    localStorage.setItem(
      STORAGE_KEYS.PANTRY_ITEMS,
      JSON.stringify([{ id: 'local', name: 'LocalItem', amount: '9' }]),
    );

    const { useLocalStorage } = await import('@/hooks/useLocalStorage');
    const { result: pantryResult } = renderHook(() =>
      useLocalStorage<{ id: string; name: string; amount: string }[]>(
        STORAGE_KEYS.PANTRY_ITEMS,
        [],
      ),
    );
    // Sanity check: hook starts on the local value.
    expect(pantryResult.current[0]).toEqual([{ id: 'local', name: 'LocalItem', amount: '9' }]);

    const { result: syncResult } = renderHook(() => useGistSync());
    await waitFor(() => expect(syncResult.current.status).toBe('synced'));

    // After the pull, the hook must reflect the remote value WITHOUT a remount.
    await waitFor(() =>
      expect(pantryResult.current[0]).toEqual([{ id: 'r1', name: 'RemoteItem', amount: '1' }]),
    );

    // And we must NOT echo the just-pulled values back as a push: that would
    // burn a network round-trip on every page load and could clobber a
    // newer remote update racing with us.
    await new Promise((r) => setTimeout(r, GIST_API.PUSH_DEBOUNCE_MS + 500));
    expect(patchSpy).not.toHaveBeenCalled();
    expect(syncResult.current.status).toBe('synced');
  });

  it('does not push when an external write happens after the initial pull completes', async () => {
    // Locks in the `source !== 'internal'` defensive filter in the change-bus
    // listener: even if some non-sync code path performs an external write
    // (e.g. a future "pull now" button) after the initial pull is done, it
    // must not be misread as a user edit and pushed back to the gist.
    configureSync();
    const remote = makeRemotePayload({ data: {} });
    const patchSpy = vi.fn();

    server.use(
      http.get(GIST_URL, () => HttpResponse.json(gistWithPayload(remote))),
      http.patch(GIST_URL, () => {
        patchSpy();
        return HttpResponse.json({ id: GIST_ID, files: {} });
      }),
    );

    const { result } = renderHook(() => useGistSync());
    await waitFor(() => expect(result.current.status).toBe('synced'));

    // Now fire an external write directly (after pullCompleteRef is true) so
    // the listener's earlier `pullCompleteRef` guard cannot mask the bug.
    const { writeLocalStorageExternal } = await import('@/hooks/useLocalStorage');
    act(() => {
      writeLocalStorageExternal(STORAGE_KEYS.PANTRY_ITEMS, [
        { id: 'x', name: 'X', amount: '1' },
      ]);
    });

    await new Promise((r) => setTimeout(r, GIST_API.PUSH_DEBOUNCE_MS + 500));
    expect(patchSpy).not.toHaveBeenCalled();
    expect(result.current.status).toBe('synced');
  });

  it('clears mounted state when a synced key is absent from the remote payload', async () => {
    // Mirrors the user scenario: a recipe is deleted on another device, then
    // the local page pulls — the local UI must drop the now-removed entry.
    configureSync();
    // Remote payload omits MEAL_PLAN to simulate "deleted on another device".
    const remote = makeRemotePayload({ data: {} });
    server.use(http.get(GIST_URL, () => HttpResponse.json(gistWithPayload(remote))));

    localStorage.setItem(
      STORAGE_KEYS.MEAL_PLAN,
      JSON.stringify({ recipes: [{ id: 'r', title: 'Stale', time: '10', ingredients: [], instructions: [], usedIngredients: [] }], shoppingList: [] }),
    );

    const { useLocalStorage } = await import('@/hooks/useLocalStorage');
    const { result: mealPlanResult } = renderHook(() =>
      useLocalStorage<unknown | null>(STORAGE_KEYS.MEAL_PLAN, null),
    );
    expect(mealPlanResult.current[0]).not.toBeNull();

    const { result: syncResult } = renderHook(() => useGistSync());
    await waitFor(() => expect(syncResult.current.status).toBe('synced'));

    // Hook must reset to its initial value when the key is removed externally.
    await waitFor(() => expect(mealPlanResult.current[0]).toBeNull());
    expect(localStorage.getItem(STORAGE_KEYS.MEAL_PLAN)).toBeNull();
  });

  it('acknowledgePull clears the justPulledFromRemote flag', async () => {
    configureSync();
    const remote = makeRemotePayload();
    server.use(http.get(GIST_URL, () => HttpResponse.json(gistWithPayload(remote))));

    const { result } = renderHook(() => useGistSync());
    await waitFor(() => expect(result.current.justPulledFromRemote).toBe(true));

    act(() => {
      result.current.acknowledgePull();
    });

    expect(result.current.justPulledFromRemote).toBe(false);
  });
});
