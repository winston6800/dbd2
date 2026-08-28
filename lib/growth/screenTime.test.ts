import { beforeEach, describe, expect, it, vi } from 'vitest';

let tokenRow: { token: string } | null;
let insertError: unknown = null;
let watchTimeRows: { platform: string; seconds: number }[];
const insertedTokens: { user_id: string; token: string }[] = [];

vi.mock('../supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'sync_tokens') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: tokenRow, error: null }),
            }),
          }),
          insert: (row: { user_id: string; token: string }) => {
            insertedTokens.push(row);
            return {
              select: () => ({
                single: async () =>
                  insertError ? { data: null, error: insertError } : { data: { token: row.token }, error: null },
              }),
            };
          },
          upsert: (row: { user_id: string; token: string }) => ({
            select: () => ({
              single: async () => ({ data: { token: row.token }, error: null }),
            }),
          }),
        };
      }
      if (table === 'watch_time') {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({ data: watchTimeRows, error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  },
}));

import { getOrCreateSyncToken, regenerateSyncToken, fetchTodayScreenTime } from './screenTime';

describe('getOrCreateSyncToken', () => {
  beforeEach(() => {
    tokenRow = null;
    insertError = null;
    insertedTokens.length = 0;
  });

  it('returns the existing token without inserting a new one', async () => {
    tokenRow = { token: 'existing-token' };
    const token = await getOrCreateSyncToken('user-1');
    expect(token).toBe('existing-token');
    expect(insertedTokens).toHaveLength(0);
  });

  it('generates and stores a token when none exists', async () => {
    tokenRow = null;
    const token = await getOrCreateSyncToken('user-1');
    expect(token).toBeTruthy();
    expect(insertedTokens).toEqual([{ user_id: 'user-1', token }]);
  });
});

describe('regenerateSyncToken', () => {
  it('always writes a fresh token', async () => {
    const first = await regenerateSyncToken('user-1');
    const second = await regenerateSyncToken('user-1');
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first).not.toBe(second);
  });
});

describe('fetchTodayScreenTime', () => {
  it('returns zero for both platforms when nothing is recorded', async () => {
    watchTimeRows = [];
    expect(await fetchTodayScreenTime('user-1')).toEqual({ youtubeSeconds: 0, twitchSeconds: 0 });
  });

  it('maps rows by platform', async () => {
    watchTimeRows = [
      { platform: 'youtube', seconds: 120 },
      { platform: 'twitch', seconds: 45 },
    ];
    expect(await fetchTodayScreenTime('user-1')).toEqual({ youtubeSeconds: 120, twitchSeconds: 45 });
  });
});
