import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * The extension has no Supabase session — it authenticates with an opaque
 * sync token instead. This checks that a missing/invalid/wrong-shaped
 * request never reaches the database write, and that a valid one resolves
 * the token to a user id before calling the atomic increment RPC.
 */

let tokenRow: { user_id: string } | null = null;
const rpc = vi.fn(async () => ({ error: null }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_col: string, value: string) => ({
          maybeSingle: async () => ({ data: value === 'good-token' ? tokenRow : null, error: null }),
        }),
      }),
    }),
    rpc,
  }),
}));

function mockReqRes(authorization: string | undefined, body: unknown) {
  const req = { method: 'POST', headers: authorization ? { authorization } : {}, body } as unknown as VercelRequest;
  const json = vi.fn();
  const res = { status: vi.fn(() => ({ json })) } as unknown as VercelResponse;
  return { req, res, json, status: res.status as unknown as ReturnType<typeof vi.fn> };
}

describe('POST /api/track-watch-time', () => {
  beforeEach(() => {
    vi.resetModules();
    tokenRow = null;
    rpc.mockClear();
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('rejects a missing sync token before touching the database', async () => {
    const handler = (await import('../api/track-watch-time')).default;
    const { req, res, status, json } = mockReqRes(undefined, { platform: 'youtube', seconds: 60, date: '2026-01-01' });

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Missing sync token' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid platform', async () => {
    const handler = (await import('../api/track-watch-time')).default;
    const { req, res, status } = mockReqRes('Bearer good-token', { platform: 'netflix', seconds: 60, date: '2026-01-01' });

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects seconds outside the sane range', async () => {
    const handler = (await import('../api/track-watch-time')).default;
    const { req, res, status } = mockReqRes('Bearer good-token', { platform: 'youtube', seconds: 999999, date: '2026-01-01' });

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a malformed date', async () => {
    const handler = (await import('../api/track-watch-time')).default;
    const { req, res, status } = mockReqRes('Bearer good-token', { platform: 'youtube', seconds: 60, date: '01/01/2026' });

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an unrecognized token without calling the RPC', async () => {
    tokenRow = null;
    const handler = (await import('../api/track-watch-time')).default;
    const { req, res, status } = mockReqRes('Bearer bad-token', { platform: 'youtube', seconds: 60, date: '2026-01-01' });

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('resolves the token to a user id and calls the increment RPC', async () => {
    tokenRow = { user_id: 'user-1' };
    const handler = (await import('../api/track-watch-time')).default;
    const { req, res, json } = mockReqRes('Bearer good-token', { platform: 'twitch', seconds: 45, date: '2026-01-01' });

    await handler(req, res);

    expect(rpc).toHaveBeenCalledWith('add_watch_time', {
      p_user_id: 'user-1',
      p_date: '2026-01-01',
      p_platform: 'twitch',
      p_seconds: 45,
    });
    expect(json).toHaveBeenCalledWith({ ok: true });
  });

  it('accepts the x platform', async () => {
    tokenRow = { user_id: 'user-1' };
    const handler = (await import('../api/track-watch-time')).default;
    const { req, res, json } = mockReqRes('Bearer good-token', { platform: 'x', seconds: 30, date: '2026-01-01' });

    await handler(req, res);

    expect(rpc).toHaveBeenCalledWith('add_watch_time', {
      p_user_id: 'user-1',
      p_date: '2026-01-01',
      p_platform: 'x',
      p_seconds: 30,
    });
    expect(json).toHaveBeenCalledWith({ ok: true });
  });
});
