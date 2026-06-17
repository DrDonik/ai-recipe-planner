import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Global cooking-timer state. Timers are started by tapping a time phrase in a
 * recipe step (see TimerChip) and surfaced in a floating tray (see TimerTray).
 *
 * Timers are kept in memory only — they intentionally do not survive a reload,
 * matching how a kitchen timer behaves during an active cooking session. The
 * countdown is derived from an absolute `endsAt` timestamp so it stays accurate
 * even if the tab is backgrounded and the tick interval is throttled.
 */

export type TimerStatus = 'running' | 'paused' | 'done';

export interface CookingTimer {
  id: string;
  /** The recipe step the timer was started from — shown in the tray. */
  label: string;
  totalMs: number;
  remainingMs: number;
  /** Epoch ms when a running timer will finish; null while paused or done. */
  endsAt: number | null;
  status: TimerStatus;
}

interface TimerContextValue {
  timers: CookingTimer[];
  muted: boolean;
  toggleMuted: () => void;
  startTimer: (label: string, durationMs: number) => string;
  pauseTimer: (id: string) => void;
  resumeTimer: (id: string) => void;
  cancelTimer: (id: string) => void;
  getTimer: (id: string) => CookingTimer | undefined;
}

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

let idCounter = 0;
const nextId = () => `timer-${Date.now()}-${idCounter++}`;

export const TimerProvider = ({ children }: { children: ReactNode }) => {
  const [timers, setTimers] = useState<CookingTimer[]>([]);
  const [muted, setMuted] = useState(false);

  // Lazily-created AudioContext, so the completion sound needs no bundled asset.
  // Created/resumed on a user gesture (starting a timer) so playback is allowed
  // later when the timer finishes.
  const audioRef = useRef<AudioContext | null>(null);
  // Timers whose completion chime has already played, so we ring exactly once.
  const playedRef = useRef<Set<string>>(new Set());

  const ensureAudio = useCallback(() => {
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioRef.current || audioRef.current.state === 'closed') {
      audioRef.current = new Ctx();
    }
    if (audioRef.current.state === 'suspended') void audioRef.current.resume();
    return audioRef.current;
  }, []);

  const playAlarm = useCallback(() => {
    if (muted) return;
    const ctx = audioRef.current;
    if (!ctx || ctx.state === 'closed') return;
    if (ctx.state === 'suspended') void ctx.resume();

    // Three short rising beeps.
    const start = ctx.currentTime;
    [0, 0.45, 0.9].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 660 + i * 220;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.3, start + offset + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start + offset);
      osc.stop(start + offset + 0.4);
    });
  }, [muted]);

  // Drive a ticking countdown only while at least one timer is running.
  const hasRunning = timers.some((t) => t.status === 'running');
  useEffect(() => {
    if (!hasRunning) return;
    const tick = () => {
      setTimers((prev) => {
        let changed = false;
        const next = prev.map((t) => {
          if (t.status !== 'running' || t.endsAt == null) return t;
          const remainingMs = Math.max(0, t.endsAt - Date.now());
          if (remainingMs <= 0) {
            changed = true;
            return { ...t, remainingMs: 0, endsAt: null, status: 'done' as const };
          }
          // Only re-render when the displayed second actually changes.
          if (Math.ceil(remainingMs / 1000) !== Math.ceil(t.remainingMs / 1000)) {
            changed = true;
            return { ...t, remainingMs };
          }
          return t;
        });
        return changed ? next : prev;
      });
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [hasRunning]);

  // Ring once for each timer that has just finished.
  useEffect(() => {
    const newlyDone = timers.filter((t) => t.status === 'done' && !playedRef.current.has(t.id));
    if (newlyDone.length === 0) return;
    newlyDone.forEach((t) => playedRef.current.add(t.id));
    playAlarm();
  }, [timers, playAlarm]);

  // Close the AudioContext when the provider unmounts.
  useEffect(() => () => {
    const ctx = audioRef.current;
    audioRef.current = null;
    if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
  }, []);

  const startTimer = useCallback((label: string, durationMs: number) => {
    ensureAudio();
    const id = nextId();
    setTimers((prev) => [
      ...prev,
      { id, label, totalMs: durationMs, remainingMs: durationMs, endsAt: Date.now() + durationMs, status: 'running' },
    ]);
    return id;
  }, [ensureAudio]);

  const pauseTimer = useCallback((id: string) => {
    setTimers((prev) => prev.map((t) =>
      t.id === id && t.status === 'running'
        ? { ...t, status: 'paused', remainingMs: Math.max(0, (t.endsAt ?? Date.now()) - Date.now()), endsAt: null }
        : t));
  }, []);

  const resumeTimer = useCallback((id: string) => {
    ensureAudio();
    setTimers((prev) => prev.map((t) =>
      t.id === id && t.status === 'paused'
        ? { ...t, status: 'running', endsAt: Date.now() + t.remainingMs }
        : t));
  }, [ensureAudio]);

  const cancelTimer = useCallback((id: string) => {
    playedRef.current.delete(id);
    setTimers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getTimer = useCallback((id: string) => timers.find((t) => t.id === id), [timers]);
  const toggleMuted = useCallback(() => setMuted((m) => !m), []);

  const value: TimerContextValue = {
    timers, muted, toggleMuted, startTimer, pauseTimer, resumeTimer, cancelTimer, getTimer,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTimers = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimers must be used within a TimerProvider');
  }
  return context;
};
