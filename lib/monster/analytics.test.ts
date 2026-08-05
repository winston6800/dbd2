import { beforeEach, describe, expect, it, vi } from 'vitest';

const inserted: Record<string, unknown>[] = [];
let rpcResult: { data: unknown; error: unknown } = { data: null, error: null };

vi.mock('../supabase', () => ({
  supabase: {
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        inserted.push(row);
        return Promise.resolve({ error: null });
      },
    }),
    rpc: async () => rpcResult,
  },
}));

import { fetchSummary, track, trackOnce } from './analytics';

describe('track', () => {
  beforeEach(() => {
    inserted.length = 0;
    sessionStorage.clear();
  });

  it('records the event with a session id', () => {
    track('landing_view');

    expect(inserted).toHaveLength(1);
    expect(inserted[0].event).toBe('landing_view');
    expect(inserted[0].session_id).toBeTruthy();
  });

  it('reuses one session id across events', () => {
    track('landing_view');
    track('landing_cta_click');

    expect(inserted[0].session_id).toBe(inserted[1].session_id);
  });

  it('passes props through', () => {
    track('boss_added', { bossCount: 3 });
    expect(inserted[0].props).toEqual({ bossCount: 3 });
  });

  it('pins attribution at first contact', () => {
    // By the time someone subscribes the referrer is long gone, so the first
    // event's attribution has to stick for the whole session.
    track('landing_view');
    const first = inserted[0];
    track('trial_started');

    expect(inserted[1].referrer).toBe(first.referrer);
    expect(inserted[1].utm_source).toBe(first.utm_source);
  });
});

describe('trackOnce', () => {
  beforeEach(() => {
    inserted.length = 0;
    sessionStorage.clear();
  });

  it('fires a funnel stage only once per session', () => {
    trackOnce('landing_view');
    trackOnce('landing_view');
    trackOnce('landing_view');

    expect(inserted).toHaveLength(1);
  });

  it('still lets other events through', () => {
    trackOnce('landing_view');
    trackOnce('paywall_view');

    expect(inserted.map(r => r.event)).toEqual(['landing_view', 'paywall_view']);
  });
});

describe('fetchSummary', () => {
  it('returns null when the caller is not an admin', async () => {
    rpcResult = { data: null, error: { message: 'not authorized' } };
    expect(await fetchSummary()).toBeNull();
  });

  it('returns the summary payload', async () => {
    rpcResult = { data: { days: 14, funnel: [], daily: [], referrers: [], totals: {} }, error: null };
    const summary = await fetchSummary(14);
    expect(summary?.days).toBe(14);
  });
});
