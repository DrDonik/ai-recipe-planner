import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Timer as TimerIcon, Pause, Play, X, Volume2, VolumeX } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useTimers } from '../contexts/TimerContext';
import { formatDuration } from '../utils/parseTimers';

/**
 * Floating tray listing all active cooking timers, each labelled with the
 * recipe step it came from. Mounted once at the app root; renders nothing when
 * no timers are running.
 *
 * Publishes its own height as `--timer-tray-height` on the document root so
 * other bottom-anchored floats can stack above it on screens too narrow to sit
 * beside it (see RecipeChat). The tray is the one that stays put: a countdown
 * is more time-critical than anything that would cover it.
 */
export const TimerTray: React.FC = () => {
  const { t } = useSettings();
  const { timers, muted, toggleMuted, pauseTimer, resumeTimer, cancelTimer } = useTimers();
  const trayRef = useRef<HTMLDivElement>(null);
  const hasTimers = timers.length > 0;

  useEffect(() => {
    const root = document.documentElement;
    const el = trayRef.current;
    if (!el) {
      root.style.setProperty('--timer-tray-height', '0px');
      return;
    }
    // The extra 8px is the gap below the float stacked on top, kept here so the
    // consumer is a plain `calc(1rem + var(...))`.
    const publishHeight = () => root.style.setProperty('--timer-tray-height', `${el.offsetHeight + 8}px`);
    publishHeight();
    // The tray grows and shrinks as timers are added, finish, or are dismissed.
    const observer = new ResizeObserver(publishHeight);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.setProperty('--timer-tray-height', '0px');
    };
  }, [hasTimers]);

  return (
    <AnimatePresence>
      {timers.length > 0 && (
        <div ref={trayRef} className="fixed bottom-4 right-4 z-50 w-72 max-w-[calc(100vw-2rem)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass-panel !p-3 shadow-glass"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-text-main">
                <TimerIcon size={16} className="text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider">{t.timers.title}</span>
              </div>
              <button
                type="button"
                onClick={toggleMuted}
                aria-pressed={muted}
                aria-label={muted ? t.timers.unmute : t.timers.mute}
                className="p-1.5 rounded-full transition-colors text-text-muted hover:text-primary hover:bg-white/50 dark:hover:bg-black/30"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>

            <ul className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1" role="list">
              <AnimatePresence initial={false}>
                {timers.map((timer) => {
                  const isDone = timer.status === 'done';
                  const isRunning = timer.status === 'running';
                  const isFollowUp = timer.phase === 'followUp';
                  const amber = isDone || isFollowUp;
                  return (
                    <motion.li
                      key={timer.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`flex items-center gap-2 rounded-lg border p-2 overflow-hidden ${
                        amber
                          ? `bg-amber-500/10 border-amber-500/30 ${isDone ? 'animate-pulse' : ''}`
                          : 'bg-white/40 dark:bg-black/20 border-border-base/30'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-muted line-clamp-2" title={timer.label}>{timer.label}</p>
                        {isFollowUp && !isDone && (
                          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400" role="status">
                            {t.timers.followUp}
                          </p>
                        )}
                        <p
                          className={`font-mono tabular-nums text-sm font-semibold ${
                            amber ? 'text-amber-600 dark:text-amber-400' : 'text-text-main'
                          }`}
                          role={isDone ? 'status' : undefined}
                        >
                          {isDone ? t.timers.done : formatDuration(timer.remainingMs)}
                        </p>
                      </div>

                      {!isDone && (
                        <button
                          type="button"
                          onClick={() => (isRunning ? pauseTimer(timer.id) : resumeTimer(timer.id))}
                          aria-label={isRunning ? t.timers.pause : t.timers.resume}
                          className="p-1.5 rounded-full transition-colors text-text-muted hover:text-primary hover:bg-white/60 dark:hover:bg-black/30"
                        >
                          {isRunning ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => cancelTimer(timer.id)}
                        aria-label={isDone ? t.timers.dismiss : t.timers.cancel}
                        className="p-1.5 rounded-full transition-colors text-text-muted hover:text-red-500 hover:bg-white/60 dark:hover:bg-black/30"
                      >
                        <X size={14} />
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
