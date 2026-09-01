import React, { useEffect, useRef, useState } from 'react';
import { Timer, Play, Pause, X } from 'lucide-react';

const SESSION_SECONDS = 25 * 60; // classic Pomodoro: 25 minutes

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
 * A single-session focus timer: 25 minutes, start/pause/reset. Only a
 * session that runs all the way to zero logs anything — pausing keeps your
 * progress, but resetting discards it, same honesty-first spirit as the
 * Honor Code entry elsewhere on Command. On completion, `onComplete` adds
 * the session to today's focus time and marks today active for the streak.
 */
export const PomodoroTimer: React.FC<{
  todayFocusMinutes: number;
  onComplete: (minutes: number) => void;
}> = ({ todayFocusMinutes, onComplete }) => {
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [running, setRunning] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          setRunning(false);
          onCompleteRef.current(SESSION_SECONDS / 60);
          return SESSION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const inProgress = running || secondsLeft !== SESSION_SECONDS;

  const reset = () => {
    setRunning(false);
    setSecondsLeft(SESSION_SECONDS);
  };

  return (
    <div className="flex items-center space-x-1.5">
      <button
        onClick={() => setRunning(r => !r)}
        className="flex items-center space-x-1.5 bg-black px-3 py-1.5 rounded-full border border-brand/30 hover:border-brand/60 transition-colors"
        title={running ? 'Pause focus session' : inProgress ? 'Resume focus session' : 'Start a 25-minute focus session'}
      >
        {inProgress ? (
          running ? <Pause size={12} className="text-brand" /> : <Play size={12} className="text-brand" />
        ) : (
          <Timer size={12} className="text-brand" />
        )}
        <span className="text-[10px] font-black text-brand tabular-nums">
          {inProgress ? formatClock(secondsLeft) : todayFocusMinutes > 0 ? `${formatMinutes(todayFocusMinutes)} today` : 'Focus Timer'}
        </span>
      </button>
      {inProgress && (
        <button onClick={reset} className="text-gray-600 hover:text-gray-400" title="Cancel session (won't be logged)">
          <X size={14} />
        </button>
      )}
    </div>
  );
};
