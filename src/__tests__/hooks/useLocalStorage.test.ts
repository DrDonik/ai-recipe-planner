import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage, subscribeToLocalStorageChanges, writeLocalStorageExternal } from '@/hooks/useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('handles string type consistently', () => {
    const { result } = renderHook(() => useLocalStorage<string>('test-string', 'initial'));

    // Set a string value
    act(() => {
      result.current[1]('hello');
    });

    // Should be stored as JSON
    expect(localStorage.getItem('test-string')).toBe(JSON.stringify('hello'));

    // Remount to test reading
    const { result: result2 } = renderHook(() => useLocalStorage<string>('test-string', 'initial'));
    expect(result2.current[0]).toBe('hello');
  });

  it('handles number type correctly', () => {
    const { result } = renderHook(() => useLocalStorage<number>('test-number', 0));

    act(() => {
      result.current[1](42);
    });

    expect(localStorage.getItem('test-number')).toBe(JSON.stringify(42));

    const { result: result2 } = renderHook(() => useLocalStorage<number>('test-number', 0));
    expect(result2.current[0]).toBe(42);
  });

  it('handles boolean type correctly', () => {
    const { result } = renderHook(() => useLocalStorage<boolean>('test-bool', false));

    act(() => {
      result.current[1](true);
    });

    expect(localStorage.getItem('test-bool')).toBe(JSON.stringify(true));

    const { result: result2 } = renderHook(() => useLocalStorage<boolean>('test-bool', false));
    expect(result2.current[0]).toBe(true);
  });

  it('handles object type correctly', () => {
    const initialObj = { name: 'test', count: 0 };
    const { result } = renderHook(() => useLocalStorage('test-obj', initialObj));

    const newObj = { name: 'updated', count: 5 };
    act(() => {
      result.current[1](newObj);
    });

    expect(localStorage.getItem('test-obj')).toBe(JSON.stringify(newObj));

    const { result: result2 } = renderHook(() => useLocalStorage('test-obj', initialObj));
    expect(result2.current[0]).toEqual(newObj);
  });

  it('handles array type correctly', () => {
    const initialArray = [1, 2, 3];
    const { result } = renderHook(() => useLocalStorage('test-array', initialArray));

    const newArray = [4, 5, 6];
    act(() => {
      result.current[1](newArray);
    });

    expect(localStorage.getItem('test-array')).toBe(JSON.stringify(newArray));

    const { result: result2 } = renderHook(() => useLocalStorage('test-array', initialArray));
    expect(result2.current[0]).toEqual(newArray);
  });

  it('removes item from localStorage when set to null', () => {
    const { result } = renderHook(() => useLocalStorage<string | null>('test-null', 'initial'));

    act(() => {
      result.current[1]('value');
    });
    expect(localStorage.getItem('test-null')).toBe(JSON.stringify('value'));

    act(() => {
      result.current[1](null);
    });
    expect(localStorage.getItem('test-null')).toBeNull();
  });

  it('removes item from localStorage when set to undefined', () => {
    const { result } = renderHook(() => useLocalStorage<string | undefined>('test-undefined', 'initial'));

    act(() => {
      result.current[1]('value');
    });
    expect(localStorage.getItem('test-undefined')).toBe(JSON.stringify('value'));

    act(() => {
      result.current[1](undefined);
    });
    expect(localStorage.getItem('test-undefined')).toBeNull();
  });

  it('handles corrupt localStorage data gracefully', () => {
    localStorage.setItem('test-corrupt', 'not valid json');

    const { result } = renderHook(() => useLocalStorage('test-corrupt', 'fallback'));

    // Should fall back to initial value when JSON.parse fails
    expect(result.current[0]).toBe('fallback');
  });

  it('handles empty string correctly', () => {
    const { result } = renderHook(() => useLocalStorage<string>('test-empty', 'initial'));

    act(() => {
      result.current[1]('');
    });

    expect(localStorage.getItem('test-empty')).toBe(JSON.stringify(''));

    const { result: result2 } = renderHook(() => useLocalStorage<string>('test-empty', 'initial'));
    expect(result2.current[0]).toBe('');
  });

  it('handles special characters in strings', () => {
    const { result } = renderHook(() => useLocalStorage<string>('test-special', 'initial'));

    const specialString = 'hello\nworld\t"quotes"\r\n';
    act(() => {
      result.current[1](specialString);
    });

    expect(localStorage.getItem('test-special')).toBe(JSON.stringify(specialString));

    const { result: result2 } = renderHook(() => useLocalStorage<string>('test-special', 'initial'));
    expect(result2.current[0]).toBe(specialString);
  });

  it('sets persistError to true when localStorage.setItem throws QuotaExceededError', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useLocalStorage<string>('test-persist-error', 'initial'));

    // Initially persistError should be false
    expect(result.current[2]).toBe(false);

    // Mock setItem to throw QuotaExceededError
    const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
    });

    act(() => {
      result.current[1]('large value');
    });

    // persistError should now be true
    expect(result.current[2]).toBe(true);
    // State should still update in React even though persistence failed
    expect(result.current[0]).toBe('large value');
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error saving localStorage key "test-persist-error":',
      expect.any(DOMException)
    );

    setItemSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('resets persistError to false after a successful write following a failure', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useLocalStorage<string>('test-persist-recovery', 'initial'));

    // Force a write failure
    const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
    });

    act(() => {
      result.current[1]('will fail');
    });

    // Confirm error state
    expect(result.current[2]).toBe(true);

    // Restore normal setItem behavior
    setItemSpy.mockRestore();

    // Trigger another write that should succeed
    act(() => {
      result.current[1]('will succeed');
    });

    // persistError should be cleared
    expect(result.current[2]).toBe(false);
    expect(result.current[0]).toBe('will succeed');
    // Verify the value was actually persisted
    expect(localStorage.getItem('test-persist-recovery')).toBe(JSON.stringify('will succeed'));

    consoleSpy.mockRestore();
  });

  it('returns persistError as the third element of the tuple and stays false after successful write', () => {
    const { result } = renderHook(() => useLocalStorage('test-tuple', 'initial'));

    // Destructure all three elements
    const [state, setState, persistError] = result.current;
    expect(state).toBe('initial');
    expect(typeof setState).toBe('function');
    expect(persistError).toBe(false);

    // Verify persistError stays false after a successful write
    act(() => {
      setState('updated');
    });
    expect(result.current[0]).toBe('updated');
    expect(result.current[2]).toBe(false);
  });

  describe('subscribeToLocalStorageChanges', () => {
    it('notifies subscribers when a value is written', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToLocalStorageChanges(listener);

      const { result } = renderHook(() => useLocalStorage<string>('test-emit', 'initial'));
      listener.mockClear();

      act(() => {
        result.current[1]('new-value');
      });

      expect(listener).toHaveBeenCalledWith({ key: 'test-emit', value: 'new-value', source: 'internal' });
      unsubscribe();
    });

    it('emits on mount with the initial state', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToLocalStorageChanges(listener);

      renderHook(() => useLocalStorage<number>('test-emit-mount', 42));

      expect(listener).toHaveBeenCalledWith({ key: 'test-emit-mount', value: 42, source: 'internal' });
      unsubscribe();
    });

    it('stops notifying after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToLocalStorageChanges(listener);
      unsubscribe();

      const { result } = renderHook(() => useLocalStorage<string>('test-emit-unsub', 'initial'));
      listener.mockClear();

      act(() => {
        result.current[1]('changed');
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it('does NOT emit if the underlying localStorage write fails', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      });

      const listener = vi.fn();
      const unsubscribe = subscribeToLocalStorageChanges(listener);

      const { result } = renderHook(() => useLocalStorage<string>('test-emit-fail', 'initial'));
      // The mount effect attempts to write — it fails, so no emit.
      listener.mockClear();

      act(() => {
        result.current[1]('also-fails');
      });

      expect(listener).not.toHaveBeenCalled();

      setItemSpy.mockRestore();
      consoleSpy.mockRestore();
      unsubscribe();
    });

    it('isolates listener errors so one broken listener does not block others', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const broken = vi.fn(() => {
        throw new Error('boom');
      });
      const good = vi.fn();
      const unsubscribeA = subscribeToLocalStorageChanges(broken);
      const unsubscribeB = subscribeToLocalStorageChanges(good);

      const { result } = renderHook(() => useLocalStorage<string>('test-isolation', 'initial'));
      broken.mockClear();
      good.mockClear();

      act(() => {
        result.current[1]('v');
      });

      expect(broken).toHaveBeenCalled();
      expect(good).toHaveBeenCalledWith({ key: 'test-isolation', value: 'v', source: 'internal' });

      unsubscribeA();
      unsubscribeB();
      consoleSpy.mockRestore();
    });
  });

  describe('writeLocalStorageExternal', () => {
    it('writes the value to localStorage as JSON', () => {
      writeLocalStorageExternal('ext-key', { a: 1 });
      expect(localStorage.getItem('ext-key')).toBe(JSON.stringify({ a: 1 }));
    });

    it('removes the key when value is undefined (the "absent from payload" sentinel)', () => {
      localStorage.setItem('ext-rm-u', JSON.stringify('present'));
      writeLocalStorageExternal('ext-rm-u', undefined);
      expect(localStorage.getItem('ext-rm-u')).toBeNull();
    });

    it('writes literal null rather than removing the key', () => {
      // Preserves the original applySyncPayload semantics: only key absence
      // removes; an explicit null in the payload is persisted as JSON `null`.
      writeLocalStorageExternal('ext-null', null);
      expect(localStorage.getItem('ext-null')).toBe('null');
    });

    it('emits an "external" change event', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToLocalStorageChanges(listener);

      writeLocalStorageExternal('ext-emit', [1, 2, 3]);

      expect(listener).toHaveBeenCalledWith({
        key: 'ext-emit',
        value: [1, 2, 3],
        source: 'external',
      });
      unsubscribe();
    });

    it('emits with value undefined when the key is removed', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToLocalStorageChanges(listener);

      writeLocalStorageExternal('ext-emit-rm', undefined);

      expect(listener).toHaveBeenCalledWith({
        key: 'ext-emit-rm',
        value: undefined,
        source: 'external',
      });
      unsubscribe();
    });
  });

  describe('useLocalStorage external-write reactivity (Gist sync bug fix)', () => {
    it('updates state when writeLocalStorageExternal overwrites the same key', () => {
      const { result } = renderHook(() => useLocalStorage<string[]>('ext-react', ['a']));
      expect(result.current[0]).toEqual(['a']);

      act(() => {
        writeLocalStorageExternal('ext-react', ['b', 'c']);
      });

      // Without the fix this would still be ['a'] because useState only reads
      // localStorage on the first render. This is the regression the bug
      // report describes: deleted/changed items still visible until reload.
      expect(result.current[0]).toEqual(['b', 'c']);
      expect(localStorage.getItem('ext-react')).toBe(JSON.stringify(['b', 'c']));
    });

    it('falls back to the initial value when an external write removes the key', () => {
      const { result } = renderHook(() => useLocalStorage<string>('ext-removed', 'default'));

      act(() => {
        result.current[1]('user-set');
      });
      expect(result.current[0]).toBe('user-set');

      act(() => {
        writeLocalStorageExternal('ext-removed', undefined);
      });

      // Hook resets to initialValue; its persistence effect then writes that
      // initial back to localStorage so the hook's own invariant (state ⇔
      // localStorage) holds. This matches what would happen after a reload.
      expect(result.current[0]).toBe('default');
      expect(localStorage.getItem('ext-removed')).toBe(JSON.stringify('default'));
    });

    it('keeps localStorage cleared when initialValue is null and key is removed externally', () => {
      // Mirrors the MEAL_PLAN sync case: omitted from remote payload → local
      // null → effect sees next=null, current=null → no rewrite, no echo.
      const { result } = renderHook(() => useLocalStorage<{ x: number } | null>('ext-null-init', null));

      act(() => {
        result.current[1]({ x: 1 });
      });
      expect(localStorage.getItem('ext-null-init')).toBe(JSON.stringify({ x: 1 }));

      act(() => {
        writeLocalStorageExternal('ext-null-init', undefined);
      });

      expect(result.current[0]).toBeNull();
      expect(localStorage.getItem('ext-null-init')).toBeNull();
    });

    it('ignores external writes targeting a different key', () => {
      const { result } = renderHook(() => useLocalStorage<number>('ext-mine', 1));

      act(() => {
        writeLocalStorageExternal('ext-other', 999);
      });

      expect(result.current[0]).toBe(1);
    });

    it('does NOT react to internal writes from other useLocalStorage instances on the same key', () => {
      // Two hooks for the same key are an unusual pattern but we want to prove
      // that external-only filtering keeps internal write semantics intact:
      // each instance owns its own state and does not get re-broadcast to itself.
      const { result: a } = renderHook(() => useLocalStorage<string>('ext-shared', 'init'));
      const { result: b } = renderHook(() => useLocalStorage<string>('ext-shared', 'init'));

      act(() => {
        a.current[1]('from-a');
      });

      // Only `a` receives the new value through its own setState; `b` stays
      // on its own state until something explicitly external happens.
      expect(a.current[0]).toBe('from-a');
      expect(b.current[0]).toBe('init');

      // An external write reaches both instances.
      act(() => {
        writeLocalStorageExternal('ext-shared', 'from-external');
      });

      expect(a.current[0]).toBe('from-external');
      expect(b.current[0]).toBe('from-external');
    });

    it('unsubscribes on unmount so external writes do not leak into stale state', () => {
      const { result, unmount } = renderHook(() =>
        useLocalStorage<string>('ext-unmount', 'initial'),
      );

      unmount();

      // Should not throw and should not be observable from the (unmounted) hook.
      expect(() => writeLocalStorageExternal('ext-unmount', 'after-unmount')).not.toThrow();
      // Last rendered value remains, since the hook is gone.
      expect(result.current[0]).toBe('initial');
    });
  });
});

