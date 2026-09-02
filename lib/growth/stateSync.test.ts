import { describe, expect, it, vi } from 'vitest';
import type { UserState } from './types';

let storedState: Record<string, unknown> | null;
const upserts: { user_id: string; state: Record<string, unknown> }[] = [];

vi.mock('../supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'user_state') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: storedState ? { state: storedState } : null, error: null }),
          }),
        }),
        upsert: (row: { user_id: string; state: Record<string, unknown> }) => {
          upserts.push(row);
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  },
}));

import { fetchRemoteState, saveRemoteState, mergeRemoteState } from './stateSync';

function baseState(overrides: Partial<UserState> = {}): UserState {
  return {
    defaultKpi: 'Unique Visitors',
    streak: 0,
    minThreshold: 100,
    history: [],
    growthDates: [],
    dailyUvs: {},
    dailyGrowthActions: {},
    dailyInfrastructureFocus: {},
    dailyShipped: {},
    stats: { avgUvPerDay: 0, conversionResilience: 0, morningShipments: 0, totalUniqueVisitors: 0, totalChurnedLeads: 0 },
    achievements: [],
    currentUvs: 0,
    isOnMaintenance: false,
    ...overrides,
  };
}

describe('fetchRemoteState', () => {
  it('returns null when nothing is stored', async () => {
    storedState = null;
    expect(await fetchRemoteState('user-1')).toBeNull();
  });

  it('returns the stored blob', async () => {
    storedState = { streak: 5, growthDates: ['2026-08-30'] };
    expect(await fetchRemoteState('user-1')).toEqual(storedState);
  });
});

describe('saveRemoteState', () => {
  it('upserts the state, excluding journalEntries', async () => {
    upserts.length = 0;
    const state = baseState({ streak: 3, journalEntries: { '2026-08-30': 'wrote code' } });
    await saveRemoteState('user-1', state);
    expect(upserts).toHaveLength(1);
    expect(upserts[0].user_id).toBe('user-1');
    expect(upserts[0].state.streak).toBe(3);
    expect(upserts[0].state).not.toHaveProperty('journalEntries');
  });

  it('includes bits earned from focus sessions in the upsert', async () => {
    upserts.length = 0;
    const state = baseState({ bits: 75 });
    await saveRemoteState('user-1', state);
    expect(upserts[0].state.bits).toBe(75);
  });
});

describe('mergeRemoteState', () => {
  it('returns local unchanged when remote is null', () => {
    const local = baseState({ streak: 2 });
    expect(mergeRemoteState(local, null)).toEqual(local);
  });

  it('merges date-keyed logs, remote winning on overlap but keeping local-only dates', () => {
    const local = baseState({ dailyUvs: { '2026-08-29': 3, '2026-08-30': 5 } });
    const remote = baseState({ dailyUvs: { '2026-08-30': 9, '2026-08-31': 2 } });
    const merged = mergeRemoteState(local, remote);
    expect(merged.dailyUvs).toEqual({ '2026-08-29': 3, '2026-08-30': 9, '2026-08-31': 2 });
  });

  it('unions and dedupes growthDates and skills case-insensitively', () => {
    const local = baseState({ growthDates: ['2026-08-29'], skills: ['React'] });
    const remote = baseState({ growthDates: ['2026-08-29', '2026-08-30'], skills: ['react', 'Postgres'] });
    const merged = mergeRemoteState(local, remote);
    expect(merged.growthDates.sort()).toEqual(['2026-08-29', '2026-08-30']);
    expect(merged.skills).toEqual(['React', 'Postgres']);
  });

  it('takes remote scalar settings when present', () => {
    const local = baseState({ streak: 1, growthObjective: 'old objective' });
    const remote = baseState({ streak: 7, growthObjective: 'new objective' });
    const merged = mergeRemoteState(local, remote);
    expect(merged.streak).toBe(7);
    expect(merged.growthObjective).toBe('new objective');
  });

  it('takes the remote bits total on sync, e.g. after earning bits on another device', () => {
    const local = baseState({ bits: 25 }); // this device earned one 25-minute session, not yet synced
    const remote = baseState({ bits: 100 }); // another device's already-synced total
    const merged = mergeRemoteState(local, remote);
    expect(merged.bits).toBe(100);
  });

  it('always keeps journalEntries from local, never remote', () => {
    const local = baseState({ journalEntries: { '2026-08-30': 'local entry' } });
    const remote = baseState() as UserState; // remote never carries journalEntries
    const merged = mergeRemoteState(local, remote);
    expect(merged.journalEntries).toEqual({ '2026-08-30': 'local entry' });
  });
});
