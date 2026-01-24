import { useState, useEffect, useCallback, useRef } from 'react';

interface UseWakeLockResult {
  isSupported: boolean;
  isActive: boolean;
  toggle: () => void;
  request: () => Promise<void>;
  release: () => Promise<void>;
}

export function useWakeLock(): UseWakeLockResult {
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  const request = useCallback(async () => {
    if (!isSupported) return;

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setIsActive(true);

      wakeLockRef.current.addEventListener('release', () => {
        setIsActive(false);
      });
    } catch {
      // Wake lock request failed (e.g., low battery, tab not visible)
      setIsActive(false);
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setIsActive(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (isActive) {
      release();
    } else {
      request();
    }
  }, [isActive, request, release]);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive && !wakeLockRef.current) {
        request();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSupported, isActive, request]);

  // Release wake lock on unmount
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);

  return {
    isSupported,
    isActive,
    toggle,
    request,
    release,
  };
}
