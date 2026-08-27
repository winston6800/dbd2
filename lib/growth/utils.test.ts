import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateCurrentStreak } from './utils';

describe('calculateCurrentStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('returns 0 when no activity dates', () => {
    expect(calculateCurrentStreak([], {}, {})).toBe(0);
  });

  it('returns 0 when latest activity is more than 2 days ago', () => {
    vi.setSystemTime(new Date('2025-02-12'));
    const oldDate = '2025-02-08';
    expect(calculateCurrentStreak([oldDate], {}, {})).toBe(0);
  });

  it('returns 1 when activity was today only', () => {
    vi.setSystemTime(new Date(2025, 1, 12, 12, 0, 0));
    const today = '2025-02-12';
    expect(calculateCurrentStreak([today], {}, {})).toBe(1);
  });

  it('returns 1 when activity was yesterday only', () => {
    vi.setSystemTime(new Date('2025-02-12'));
    const yesterday = '2025-02-11';
    expect(calculateCurrentStreak([yesterday], {}, {})).toBe(1);
  });

  it('returns 3 for 3 consecutive days ending today', () => {
    vi.setSystemTime(new Date(2025, 1, 12, 12, 0, 0));
    const dates = ['2025-02-12', '2025-02-11', '2025-02-10'];
    expect(calculateCurrentStreak(dates, {}, {})).toBe(3);
  });

  it('returns 2 for 2 consecutive days ending yesterday', () => {
    vi.setSystemTime(new Date('2025-02-12'));
    const dates = ['2025-02-11', '2025-02-10'];
    expect(calculateCurrentStreak(dates, {}, {})).toBe(2);
  });

  it('counts infrastructure focus dates', () => {
    vi.setSystemTime(new Date(2025, 1, 12, 12, 0, 0));
    const focus = { '2025-02-12': true };
    expect(calculateCurrentStreak([], focus, {})).toBe(1);
  });

  it('counts shipped dates', () => {
    vi.setSystemTime(new Date(2025, 1, 12, 12, 0, 0));
    const shipped = { '2025-02-12': true };
    expect(calculateCurrentStreak([], {}, shipped)).toBe(1);
  });

  it('breaks streak when there is a gap', () => {
    vi.setSystemTime(new Date(2025, 1, 12, 12, 0, 0));
    const dates = ['2025-02-12', '2025-02-10'];
    expect(calculateCurrentStreak(dates, {}, {})).toBe(1);
  });
});
