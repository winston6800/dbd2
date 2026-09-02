import React from 'react';
import { X, Play, Pause, Minus, Plus, Sparkles } from 'lucide-react';
import type { FocusTimer } from '../../lib/growth/useFocusTimer';
import { FocusCharacter } from './FocusCharacter';

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes}m`;
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * The full-screen focus session — opened by tapping the Focus Timer badge
 * on Command. Closing (X) just minimizes it: the timer (lifted up in
 * BaseHub via useFocusTimer) keeps running and the badge shows the live
 * countdown. "Cancel session" is the only way to actually discard progress.
 */
export const FocusSession: React.FC<{
  timer: FocusTimer;
  todayFocusMinutes: number;
  totalBits: number;
  onClose: () => void;
}> = ({ timer, todayFocusMinutes, totalBits, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-dark-card border border-brand/40 p-8 rounded-[40px] shadow-2xl max-w-xs w-full text-center space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-500 hover:text-white"
          title="Minimize (session keeps running)"
        >
          <X size={18} />
        </button>

        {timer.justCompleted !== null ? (
          <>
            <FocusCharacter state="done" />
            <div>
              <h3 className="text-2xl font-black italic uppercase text-white">Session Complete</h3>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">
                {timer.justCompleted} minutes focused
              </p>
            </div>
            <div className="bg-black/60 border border-brand/30 rounded-2xl py-5 space-y-1">
              <p className="flex items-center justify-center gap-2 text-3xl font-black italic text-brand">
                <Sparkles size={22} />
                <span>+{timer.justCompleted} BITS</span>
              </p>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest">{totalBits} total</p>
            </div>
            <button
              onClick={() => { timer.dismissCompletion(); onClose(); }}
              className="w-full py-4 bg-brand text-white font-black uppercase tracking-widest rounded-2xl"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-black italic uppercase text-white tracking-tighter">Focus Session</h3>

            <FocusCharacter
              state={timer.status === 'running' ? 'running' : timer.status === 'paused' ? 'paused' : 'idle'}
              ratio={1 - timer.secondsLeft / (timer.durationMin * 60)}
            />

            <div className="text-5xl font-black italic text-white tabular-nums">{formatClock(timer.secondsLeft)}</div>

            {timer.canAdjustDuration && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => timer.adjustDuration(-5)}
                  disabled={timer.durationMin <= 5}
                  className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 text-brand flex items-center justify-center disabled:opacity-30"
                  title="5 minutes less"
                >
                  <Minus size={16} />
                </button>
                <span className="text-sm font-black text-gray-400 uppercase tracking-widest w-24">{timer.durationMin} min</span>
                <button
                  onClick={() => timer.adjustDuration(5)}
                  disabled={timer.durationMin >= 120}
                  className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 text-brand flex items-center justify-center disabled:opacity-30"
                  title="5 minutes more"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}

            <button
              onClick={() => (timer.status === 'running' ? timer.pause() : timer.start())}
              className="w-full py-4 bg-brand text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2"
            >
              {timer.status === 'running' ? (
                <><Pause size={18} /><span>Pause</span></>
              ) : timer.status === 'paused' ? (
                <><Play size={18} /><span>Resume</span></>
              ) : (
                <><Play size={18} /><span>Start Focusing</span></>
              )}
            </button>

            {timer.status !== 'idle' && (
              <button
                onClick={timer.cancel}
                className="text-[10px] text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold"
              >
                Cancel session (won&apos;t be logged)
              </button>
            )}

            {timer.status === 'idle' && (todayFocusMinutes > 0 || totalBits > 0) && (
              <p className="text-[9px] text-gray-600">
                {formatMinutes(todayFocusMinutes)} focused today · {totalBits} bits total
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
