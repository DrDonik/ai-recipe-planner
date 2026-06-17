import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Timer as TimerIcon, Pause, Play, X, Volume2, VolumeX } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useTimers } from '../contexts/TimerContext';
import { formatDuration } from '../utils/parseTimers';

/**
 * Floating tray listing all active cooking timers, each labelled with the
 * recipe step it came from. Mounted once at the app root; renders nothing when
 * no timers are running.
 */
export const TimerTray: React.FC = () => {
  const { t } = useSettings();
  const { timers, muted, toggleMuted, pauseTimer, resumeTimer, cancelTimer } = useTimers();

  return (
    <AnimatePresence>
      {timers.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 w-72 max-w-[calc(100vw-2rem)]">
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
                onClick={toggleMuted}
                aria-pressed={muted}
                aria-label={muted ? t.timers.unmute : t.timers.mute}
                className="p-1.5 rounded-full transition-colors text-text-muted hover:text-primary hover:bg-white/50 dark:hover:bg-black/30"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>

            <ul className="flex flex-col gap-2" role="list">
              <AnimatePresence initial={false}>
                {timers.map((timer) => {
                  const isDone = timer.status === 'done';
                  const isRunning = timer.status === 'running';
                  return (
                    <motion.li
                      key={timer.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`flex items-center gap-2 rounded-lg border p-2 overflow-hidden ${
                        isDone
                          ? 'bg-amber-500/10 border-amber-500/30 animate-pulse'
                          : 'bg-white/40 dark:bg-black/20 border-border-base/30'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-muted truncate" title={timer.label}>{timer.label}</p>
                        <p
                          className={`font-mono tabular-nums text-sm font-semibold ${
                            isDone ? 'text-amber-600 dark:text-amber-400' : 'text-text-main'
                          }`}
                          role={isDone ? 'status' : undefined}
                        >
                          {isDone ? t.timers.done : formatDuration(timer.remainingMs)}
                        </p>
                      </div>

                      {!isDone && (
                        <button
                          onClick={() => (isRunning ? pauseTimer(timer.id) : resumeTimer(timer.id))}
                          aria-label={isRunning ? t.timers.pause : t.timers.resume}
                          className="p-1.5 rounded-full transition-colors text-text-muted hover:text-primary hover:bg-white/60 dark:hover:bg-black/30"
                        >
                          {isRunning ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                      )}
                      <button
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
