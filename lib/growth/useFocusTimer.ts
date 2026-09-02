import { useEffect, useRef, useState } from 'react';

export const MIN_FOCUS_MINUTES = 5;
export const MAX_FOCUS_MINUTES = 120;
export const FOCUS_DURATION_STEP = 5;
const DEFAULT_FOCUS_MINUTES = 25;

export type FocusStatus = 'idle' | 'running' | 'paused';

/**
 * A single-session focus timer with a customizable duration. Only a session
 * that runs all the way to zero calls `onComplete` — pausing keeps
 * progress, cancelling discards it, same honesty-first spirit as Honor
 * Code elsewhere on Command. Lives above both the compact header badge and
 * the full-screen FocusSession modal (see GrowthProtocolApp's BaseHub), so
 * the countdown keeps running even while the modal is closed.
 */
export function useFocusTimer(onComplete: (minutes: number) => void) {
  const [durationMin, setDurationMinState] = useState(DEFAULT_FOCUS_MINUTES);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_FOCUS_MINUTES * 60);
  const [status, setStatus] = useState<FocusStatus>('idle');
  const [justCompleted, setJustCompleted] = useState<number | null>(null);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const durationRef = useRef(durationMin);
  durationRef.current = durationMin;

  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  // Completion is a separate effect, not folded into the interval's own
  // setState updater above — calling onComplete (which updates UserState on
  // a parent component) from inside another component's updater function
  // triggers React's "Cannot update a component while rendering a different
  // component" warning, and risks the update being dropped.
  useEffect(() => {
    if (status !== 'running' || secondsLeft > 0) return;
    const minutes = durationRef.current;
    setStatus('idle');
    setJustCompleted(minutes);
    onCompleteRef.current(minutes);
    setSecondsLeft(minutes * 60);
  }, [status, secondsLeft]);

  const start = () => {
    setJustCompleted(null);
    setStatus('running');
  };

  const pause = () => setStatus('paused');

  const cancel = () => {
    setStatus('idle');
    setSecondsLeft(durationMin * 60);
    setJustCompleted(null);
  };

  const adjustDuration = (deltaMinutes: number) => {
    setDurationMinState(prev => {
      const next = Math.max(MIN_FOCUS_MINUTES, Math.min(MAX_FOCUS_MINUTES, prev + deltaMinutes));
      setSecondsLeft(next * 60);
      return next;
    });
  };

  return {
    durationMin,
    secondsLeft,
    status,
    justCompleted,
    canAdjustDuration: status === 'idle',
    start,
    pause,
    cancel,
    adjustDuration,
    dismissCompletion: () => setJustCompleted(null),
  };
}

export type FocusTimer = ReturnType<typeof useFocusTimer>;
