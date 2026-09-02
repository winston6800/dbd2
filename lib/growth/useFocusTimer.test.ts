import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFocusTimer } from './useFocusTimer';

describe('useFocusTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts idle at the default 25-minute duration', () => {
    const { result } = renderHook(() => useFocusTimer(() => {}));
    expect(result.current.status).toBe('idle');
    expect(result.current.durationMin).toBe(25);
    expect(result.current.secondsLeft).toBe(25 * 60);
    expect(result.current.justCompleted).toBeNull();
  });

  it('lets duration be adjusted in 5-minute steps while idle, clamped to [5, 120]', () => {
    const { result } = renderHook(() => useFocusTimer(() => {}));

    act(() => result.current.adjustDuration(-5));
    expect(result.current.durationMin).toBe(20);
    expect(result.current.secondsLeft).toBe(20 * 60);

    act(() => { for (let i = 0; i < 10; i++) result.current.adjustDuration(-5); });
    expect(result.current.durationMin).toBe(5); // clamped at the floor

    act(() => { for (let i = 0; i < 30; i++) result.current.adjustDuration(5); });
    expect(result.current.durationMin).toBe(120); // clamped at the ceiling
  });

  it('counts down once started, and cancel discards progress without calling onComplete', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useFocusTimer(onComplete));

    act(() => result.current.start());
    expect(result.current.status).toBe('running');

    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.secondsLeft).toBe(25 * 60 - 5);

    act(() => result.current.cancel());
    expect(result.current.status).toBe('idle');
    expect(result.current.secondsLeft).toBe(25 * 60);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('pausing keeps progress; resuming continues from where it left off', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useFocusTimer(onComplete));

    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(10000); });
    act(() => result.current.pause());
    expect(result.current.status).toBe('paused');
    const pausedAt = result.current.secondsLeft;

    act(() => { vi.advanceTimersByTime(10000); }); // time passing while paused shouldn't tick
    expect(result.current.secondsLeft).toBe(pausedAt);

    act(() => result.current.start()); // resume
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.secondsLeft).toBe(pausedAt - 5);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete with the chosen duration once it fully elapses, and resets for next time', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useFocusTimer(onComplete));

    act(() => result.current.adjustDuration(-15)); // 10-minute session
    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(10 * 60 * 1000); });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(10);
    expect(result.current.status).toBe('idle');
    expect(result.current.justCompleted).toBe(10);
    expect(result.current.secondsLeft).toBe(10 * 60);
  });

  it('dismissCompletion clears the completion flag', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useFocusTimer(onComplete));
    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(25 * 60 * 1000); });
    expect(result.current.justCompleted).toBe(25);

    act(() => result.current.dismissCompletion());
    expect(result.current.justCompleted).toBeNull();
  });
});
