import React from 'react';
import { Timer as TimerIcon, BellRing } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useTimers } from '../contexts/TimerContext';
import { formatDuration } from '../utils/parseTimers';

interface TimerChipProps {
  /**
   * Stable identity of this phrase (`recipeId::stepIndex::segmentIndex`).
   * Identical across the grid and focus views of the same recipe, so the chip
   * keeps showing a running timer after a remount.
   */
  sourceId: string;
  /** The matched time phrase, e.g. "5 minutes". */
  text: string;
  durationMs: number;
  /** The full recipe step, used as the timer's label in the tray. */
  label: string;
}

/**
 * An inline, clickable time phrase inside a recipe step. Tapping it starts a
 * countdown (shown in place and in the tray); tapping again cancels it. Lives
 * inside a step <li> that toggles its own highlight, so clicks/keys are stopped
 * from bubbling to the parent.
 */
export const TimerChip: React.FC<TimerChipProps> = ({ sourceId, text, durationMs, label }) => {
  const { t } = useSettings();
  const { timers, startTimer, cancelTimer } = useTimers();

  // Derive from global state (rather than local state) so the chip survives
  // remounts — e.g. opening the same recipe in the focus view.
  const timer = timers.find((t) => t.sourceId === sourceId);
  const done = timer?.status === 'done';
  const active = !!timer && !done;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (timer) {
      cancelTimer(timer.id);
    } else {
      startTimer(sourceId, label, durationMs);
    }
  };

  // Stop Enter/Space from also toggling the parent step's highlight.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
  };

  const display = done ? t.timers.done : active ? formatDuration(timer.remainingMs) : text;

  const colors = done
    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse'
    : active
      ? 'bg-secondary/15 text-secondary border-secondary/30 hover:bg-secondary/25'
      : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20';

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${display} — ${done ? t.timers.dismiss : active ? t.timers.cancel : t.timers.startAria}`}
      className={`inline-flex items-center gap-1 align-middle rounded-full border px-1.5 py-0.5 mx-0.5 text-[0.85em] font-medium leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${colors}`}
    >
      {done ? <BellRing size={13} /> : <TimerIcon size={13} />}
      <span className="tabular-nums">{display}</span>
    </button>
  );
};
