import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
  // The root MotionConfig already drops transforms and the `layout` animation
  // below, but not the explicit height keys — and those are the ones that move
  // things: the tray is bottom-anchored, so a row growing in pushes the rows
  // above it (and the running countdowns being read there) upwards, and the
  // ResizeObserver republishes --timer-tray-height on every frame of the tween,
  // which drags RecipeChat's float along with it on narrow screens.
  const reducedMotion = useReducedMotion();

  // Spoken counterpart of the chime: the alarm says *that* a timer reached its
  // end, this says *which* one. Derived while rendering rather than pushed on
  // the transition, which keeps the running countdown out of the region — the
  // string only moves when a phase does, so the ticks change nothing and
  // nothing is re-announced.
  //
  // The label is the instruction sentence the timer was started from, long
  // enough that it only earns its place once a second timer exists to tell it
  // apart from. The state leads either way, so the point of the announcement
  // lands before any sentence does.
  const withLabel = timers.length > 1;
  const announcement = timers
    .filter((timer) => timer.status === 'done' || timer.phase === 'followUp')
    .map((timer) => {
      const state = timer.status === 'done' ? t.timers.done : t.timers.followUp;
      return withLabel ? `${state}: ${timer.label}` : state;
    })
    .join(' ');

  useEffect(() => {
    const root = document.documentElement;
    const el = trayRef.current;
    if (!el) {
      root.style.setProperty('--timer-tray-height', '0px');
      return;
    }
    // A non-zero height carries an extra 8px — the gap below the float stacked
    // on top — so the consumer stays a plain `calc(1rem + var(...))`. Height 0
    // must stay exactly 0: the observer also fires with 0 when AnimatePresence
    // finally detaches the tray, and adding the gap there would strand the
    // float 8px above its resting position for the rest of the session.
    const publishHeight = () => {
      const height = el.offsetHeight;
      root.style.setProperty('--timer-tray-height', height > 0 ? `${height + 8}px` : '0px');
    };
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
    <>
      {/* Mounted at the app root for the whole session, so the region is in the
          DOM long before a timer flips. A live region inserted together with
          its first text is announced by almost no screen reader — which is
          why the role cannot simply live on the rows below. */}
      <p className="sr-only" role="status">{announcement}</p>
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
                        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        className={`flex items-center gap-2 rounded-lg border p-2 overflow-hidden ${
                          amber
                            ? `bg-warning/10 border-warning/30 ${isDone ? 'animate-pulse' : ''}`
                            : 'bg-white/40 dark:bg-black/20 border-border-base/30'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-muted line-clamp-2" title={timer.label}>{timer.label}</p>
                          {isFollowUp && !isDone && (
                            <p className="text-xs font-bold uppercase tracking-wider text-warning-text">
                              {t.timers.followUp}
                            </p>
                          )}
                          <p
                            className={`font-mono tabular-nums text-sm font-semibold ${
                              amber ? 'text-warning-text' : 'text-text-main'
                            }`}
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
    </>
  );
};
