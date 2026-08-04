import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const remote: { row: { state: unknown } | null; error: unknown; upserts: unknown[] } = {
  row: null,
  error: null,
  upserts: [],
};

vi.mock('../supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: remote.row, error: remote.error }),
        }),
      }),
      upsert: async (payload: unknown) => {
        remote.upserts.push(payload);
        return { error: remote.error };
      },
    }),
  },
}));

import { createBoardSaver, loadBoard } from './sync';
import { loadState, saveState } from './storage';
import type { PersistedState } from './types';

const board: PersistedState = {
  goal: { name: 'Ship it', monsterName: 'Shipoloth the Endless', miniBosses: [] },
  activeIndex: 0,
};

describe('loadBoard', () => {
  beforeEach(() => {
    localStorage.clear();
    remote.row = null;
    remote.error = null;
    remote.upserts = [];
  });

  it('prefers the cloud copy and caches it locally', async () => {
    remote.row = { state: board };

    const loaded = await loadBoard('user-1');

    expect(loaded?.goal?.name).toBe('Ship it');
    // A second device now has it cached for instant loads.
    expect(loadState('user-1')?.goal?.name).toBe('Ship it');
  });

  it('uploads a local-only board so it survives the next device', async () => {
    saveState('user-1', board);

    const loaded = await loadBoard('user-1');

    expect(loaded?.goal?.name).toBe('Ship it');
    expect(remote.upserts).toHaveLength(1);
  });

  it('falls back to the local copy when the cloud read fails', async () => {
    saveState('user-1', board);
    remote.error = { message: 'network down' };

    const loaded = await loadBoard('user-1');

    expect(loaded?.goal?.name).toBe('Ship it');
  });

  it('returns null for a genuinely new user', async () => {
    expect(await loadBoard('brand-new')).toBeNull();
  });

  it('does not leak another user’s cached board', async () => {
    saveState('user-1', board);
    expect(await loadBoard('user-2')).toBeNull();
  });
});

describe('createBoardSaver', () => {
  beforeEach(() => {
    localStorage.clear();
    remote.row = null;
    remote.error = null;
    remote.upserts = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes locally at once and to the cloud on a debounce', () => {
    const saver = createBoardSaver('user-1', 800);

    saver.save(board);
    expect(loadState('user-1')?.goal?.name).toBe('Ship it');
    expect(remote.upserts).toHaveLength(0);

    vi.advanceTimersByTime(800);
    expect(remote.upserts).toHaveLength(1);
  });

  it('collapses a burst of edits into one cloud write', () => {
    const saver = createBoardSaver('user-1', 800);

    for (let i = 0; i < 5; i++) saver.save({ ...board, activeIndex: i });
    vi.advanceTimersByTime(800);

    expect(remote.upserts).toHaveLength(1);
  });

  it('flush pushes a pending write immediately', () => {
    const saver = createBoardSaver('user-1', 800);

    saver.save(board);
    saver.flush();

    expect(remote.upserts).toHaveLength(1);
    // Nothing left to fire once the timer would have elapsed.
    vi.advanceTimersByTime(800);
    expect(remote.upserts).toHaveLength(1);
  });

  it('flush is a no-op when nothing is pending', () => {
    const saver = createBoardSaver('user-1', 800);
    saver.flush();
    expect(remote.upserts).toHaveLength(0);
  });
});
