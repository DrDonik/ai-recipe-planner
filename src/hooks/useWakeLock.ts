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
  // Track if user wants the wake lock on (persists across visibility changes)
  const userWantsActiveRef = useRef(false);
  // Track the release handler to prevent memory leaks from multiple listeners
  const releaseHandlerRef = useRef<(() => void) | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  const request = useCallback(async () => {
    if (!isSupported) return;

    // If we already have an active wake lock, don't request another
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      return;
    }

    try {
      const sentinel = await navigator.wakeLock.request('screen');

      // Clean up previous release handler if it exists
      if (releaseHandlerRef.current && wakeLockRef.current) {
        wakeLockRef.current.removeEventListener('release', releaseHandlerRef.current);
      }

      wakeLockRef.current = sentinel;
      userWantsActiveRef.current = true;
      setIsActive(true);

      // Use a named function so we can reference it
      const handleRelease = () => {
        // Only update state, don't clear the ref - system released it
        setIsActive(false);
      };

      // Store the handler in a ref for cleanup
      releaseHandlerRef.current = handleRelease;
      sentinel.addEventListener('release', handleRelease, { once: true });
    } catch {
      // Wake lock request failed (e.g., low battery, tab not visible, no user gesture on Safari)
      setIsActive(false);
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    userWantsActiveRef.current = false;

    if (wakeLockRef.current) {
      // Clean up release handler
      if (releaseHandlerRef.current) {
        wakeLockRef.current.removeEventListener('release', releaseHandlerRef.current);
        releaseHandlerRef.current = null;
      }

      try {
        // Check if not already released before calling release
        if (!wakeLockRef.current.released) {
          await wakeLockRef.current.release();
        }
      } catch {
        // Ignore errors during release (may already be released)
      }
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

  // Re-acquire wake lock when page becomes visible again (if user wanted it on)
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userWantsActiveRef.current) {
        // Check if wake lock was released by the system (tab hidden)
        if (!wakeLockRef.current || wakeLockRef.current.released) {
          request();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSupported, request]);

  // Release wake lock on unmount
  useEffect(() => {
    return () => {
      userWantsActiveRef.current = false;
      if (wakeLockRef.current) {
        // Clean up release handler
        if (releaseHandlerRef.current) {
          wakeLockRef.current.removeEventListener('release', releaseHandlerRef.current);
          releaseHandlerRef.current = null;
        }

        try {
          if (!wakeLockRef.current.released) {
            wakeLockRef.current.release();
          }
        } catch {
          // Ignore errors during cleanup
        }
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
