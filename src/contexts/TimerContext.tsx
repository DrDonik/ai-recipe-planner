import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

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
  /**
   * Stable identity of the originating time phrase
   * (`recipeId::stepIndex::segmentIndex`). Lets a chip rediscover its own timer
   * after a remount — e.g. when the same recipe is opened in the focus view.
   */
  sourceId: string;
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
  startTimer: (sourceId: string, label: string, durationMs: number) => string;
  pauseTimer: (id: string) => void;
  resumeTimer: (id: string) => void;
  cancelTimer: (id: string) => void;
}

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

let idCounter = 0;
const nextId = () => `timer-${Date.now()}-${idCounter++}`;

// The completion chime — three short rising beeps — is synthesized in code and
// exposed as a WAV object URL so no audio asset has to be bundled. It is played
// through an <audio> element rather than the Web Audio API on purpose: on
// iOS/iPadOS Safari, Web Audio is silenced by the device's mute switch, while
// HTML5 media elements keep playing. A short lead of silence lets us unlock
// playback on a user gesture (see ensureAudio) without an audible blip.
const CHIME_LEAD_S = 0.15;
const CHIME_BEEPS = [
  { freq: 660, offset: 0 },
  { freq: 880, offset: 0.45 },
  { freq: 1100, offset: 0.9 },
];

let chimeUrl: string | null = null;
const getChimeUrl = () => {
  if (chimeUrl) return chimeUrl;

  const sampleRate = 44100;
  const beepDur = 0.4; // envelope window per beep
  const attack = 0.05;
  const decayTau = 0.0375; // exponential fall from 0.3 to ~0 over ~0.3s
  const lastOffset = CHIME_BEEPS[CHIME_BEEPS.length - 1].offset;
  const total = CHIME_LEAD_S + lastOffset + beepDur;
  const length = Math.ceil(sampleRate * total);
  const samples = new Float32Array(length);

  CHIME_BEEPS.forEach(({ freq, offset }) => {
    const startSample = Math.floor((CHIME_LEAD_S + offset) * sampleRate);
    const beepSamples = Math.floor(beepDur * sampleRate);
    for (let i = 0; i < beepSamples; i++) {
      const t = i / sampleRate;
      const env = t < attack ? 0.3 * (t / attack) : 0.3 * Math.exp(-(t - attack) / decayTau);
      samples[startSample + i] += Math.sin(2 * Math.PI * freq * t) * env;
    }
  });

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // format: PCM
  view.setUint16(22, 1, true); // channels: mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  chimeUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  return chimeUrl;
};

export const TimerProvider = ({ children }: { children: ReactNode }) => {
  const [timers, setTimers] = useState<CookingTimer[]>([]);
  const [muted, setMuted] = useState(false);

  // <audio> element playing the synthesized chime. Unlocked on a user gesture
  // (starting/resuming a timer) so it is allowed to ring later when the timer
  // finishes — iOS only permits play() from within a gesture.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Timers whose completion chime has already played, so we ring exactly once.
  const playedRef = useRef<Set<string>>(new Set());

  const ensureAudio = useCallback(() => {
    if (typeof Audio === 'undefined' || audioRef.current) return;

    const el = new Audio(getChimeUrl());
    el.preload = 'auto';
    audioRef.current = el;

    // Prime playback once, within the current gesture: start, then immediately
    // pause and rewind. iOS registers the synchronous play() call to unlock the
    // element, while the synchronous pause() guarantees no sound is emitted.
    // Doing this only on first creation avoids interrupting an already-playing
    // chime when another timer is started or resumed.
    const playPromise = el.play();
    el.pause();
    el.currentTime = 0;
    void playPromise?.catch(() => {});
  }, []);

  const playAlarm = useCallback(() => {
    if (muted) return;
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().catch(() => {});
  }, [muted]);

  // Drive a ticking countdown only while at least one timer is running.
  const hasRunning = timers.some((t) => t.status === 'running');
  useEffect(() => {
    if (!hasRunning) return;
    const tick = () => {
      const now = Date.now();
      setTimers((prev) => {
        let changed = false;
        const next = prev.map((t) => {
          if (t.status !== 'running' || t.endsAt == null) return t;
          const remainingMs = Math.max(0, t.endsAt - now);
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
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [hasRunning]);

  // Ring once for each timer that has just finished.
  useEffect(() => {
    const newlyDone = timers.filter((t) => t.status === 'done' && !playedRef.current.has(t.id));
    if (newlyDone.length === 0) return;
    newlyDone.forEach((t) => playedRef.current.add(t.id));
    playAlarm();
  }, [timers, playAlarm]);

  // Release the audio element when the provider unmounts.
  useEffect(() => () => {
    const el = audioRef.current;
    audioRef.current = null;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load(); // free buffered audio in WebKit/Safari
    }
  }, []);

  const startTimer = useCallback((sourceId: string, label: string, durationMs: number) => {
    ensureAudio();
    const id = nextId();
    const endsAt = Date.now() + durationMs;
    setTimers((prev) => [
      ...prev,
      { id, sourceId, label, totalMs: durationMs, remainingMs: durationMs, endsAt, status: 'running' },
    ]);
    return id;
  }, [ensureAudio]);

  const pauseTimer = useCallback((id: string) => {
    const now = Date.now();
    setTimers((prev) => prev.map((t) =>
      t.id === id && t.status === 'running'
        ? { ...t, status: 'paused', remainingMs: Math.max(0, (t.endsAt ?? now) - now), endsAt: null }
        : t));
  }, []);

  const resumeTimer = useCallback((id: string) => {
    ensureAudio();
    const now = Date.now();
    setTimers((prev) => prev.map((t) =>
      t.id === id && t.status === 'paused'
        ? { ...t, status: 'running', endsAt: now + t.remainingMs }
        : t));
  }, [ensureAudio]);

  const cancelTimer = useCallback((id: string) => {
    playedRef.current.delete(id);
    setTimers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleMuted = useCallback(() => setMuted((m) => !m), []);

  const value = useMemo<TimerContextValue>(() => ({
    timers, muted, toggleMuted, startTimer, pauseTimer, resumeTimer, cancelTimer,
  }), [timers, muted, toggleMuted, startTimer, pauseTimer, resumeTimer, cancelTimer]);

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
