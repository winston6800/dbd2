import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PomodoroTimer } from './PomodoroTimer';

describe('PomodoroTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "Focus Timer" when idle with nothing logged today', () => {
    render(<PomodoroTimer todayFocusMinutes={0} onComplete={() => {}} />);
    expect(screen.getByText('Focus Timer')).toBeDefined();
  });

  it("shows today's total when idle and something is already logged", () => {
    render(<PomodoroTimer todayFocusMinutes={50} onComplete={() => {}} />);
    expect(screen.getByText('50m today')).toBeDefined();
  });

  it('counts down once started, and reset cancels without logging anything', () => {
    const onComplete = vi.fn();
    render(<PomodoroTimer todayFocusMinutes={0} onComplete={onComplete} />);

    fireEvent.click(screen.getByTitle('Start a 25-minute focus session'));
    expect(screen.getByText('25:00')).toBeDefined();

    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText('24:55')).toBeDefined();

    fireEvent.click(screen.getByTitle("Cancel session (won't be logged)"));
    expect(screen.getByText('Focus Timer')).toBeDefined();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete with 25 minutes once the full session elapses, then resets', () => {
    const onComplete = vi.fn();
    render(<PomodoroTimer todayFocusMinutes={0} onComplete={onComplete} />);

    fireEvent.click(screen.getByTitle('Start a 25-minute focus session'));
    act(() => { vi.advanceTimersByTime(25 * 60 * 1000); });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(25);
    expect(screen.getByText('Focus Timer')).toBeDefined();
  });

  it('pausing keeps progress instead of discarding it', () => {
    const onComplete = vi.fn();
    render(<PomodoroTimer todayFocusMinutes={0} onComplete={onComplete} />);

    fireEvent.click(screen.getByTitle('Start a 25-minute focus session'));
    act(() => { vi.advanceTimersByTime(10000); }); // 10s in
    fireEvent.click(screen.getByTitle('Pause focus session'));
    expect(screen.getByText('24:50')).toBeDefined();

    // Time passing while paused shouldn't advance the countdown.
    act(() => { vi.advanceTimersByTime(10000); });
    expect(screen.getByText('24:50')).toBeDefined();

    // Resuming continues from where it left off.
    fireEvent.click(screen.getByTitle('Resume focus session'));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText('24:45')).toBeDefined();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
