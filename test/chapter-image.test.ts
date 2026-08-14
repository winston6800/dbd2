import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Mirrors test/agent-turn.test.ts: this endpoint holds the OpenAI key and is
 * the only path to it, so entitlement has to be enforced here, not just in
 * the client gate. Same shape of tests, different upstream.
 */

let authResult: { id: string; email: string } | null = null;
let subscriptionRow: { status: string } | null = null;

vi.mock('../api/_auth', () => ({
  getAuthenticatedUser: async () => authResult,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => ({ maybeSingle: async () => ({ data: subscriptionRow }) }),
        }),
      }),
    }),
  }),
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function ok(b64: string) {
  return { ok: true, status: 200, json: async () => ({ data: [{ b64_json: b64 }] }) };
}

function mockReqRes(body: unknown, authorization = 'Bearer good-token') {
  const req = { method: 'POST', headers: { authorization }, body } as unknown as VercelRequest;
  const json = vi.fn();
  const res = { status: vi.fn(() => ({ json })) } as unknown as VercelResponse;
  return { req, res, json, status: res.status as unknown as ReturnType<typeof vi.fn> };
}

async function handler() {
  return (await import('../api/chapter-image')).default;
}

describe('POST /api/chapter-image', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(ok('ZmFrZS1wbmc='));
    authResult = { id: 'user-1', email: 'real@example.com' };
    subscriptionRow = { status: 'active' };
    process.env.OPENAI_API_KEY = 'sk-openai-test';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.VITE_ADMIN_EMAILS = '';
  });

  it('returns a data: URI built from the base64 image for an entitled caller', async () => {
    const { req, res, json } = mockReqRes({ prompt: 'a fork in the tracks' });
    await (await handler())(req, res);

    expect(json).toHaveBeenCalledWith({ dataUrl: 'data:image/png;base64,ZmFrZS1wbmc=' });
  });

  it('rejects an unauthenticated caller before spending a token', async () => {
    authResult = null;
    const { req, res, status } = mockReqRes({ prompt: 'x' });
    await (await handler())(req, res);

    expect(status).toHaveBeenCalledWith(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a signed-in caller with no entitled subscription', async () => {
    subscriptionRow = null;
    const { req, res, status } = mockReqRes({ prompt: 'x' });
    await (await handler())(req, res);

    expect(status).toHaveBeenCalledWith(402);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lets an admin email through without a subscription', async () => {
    subscriptionRow = null;
    process.env.VITE_ADMIN_EMAILS = 'Real@Example.com';
    const { req, res, json } = mockReqRes({ prompt: 'x' });
    await (await handler())(req, res);

    expect(json).toHaveBeenCalledWith({ dataUrl: expect.stringContaining('data:image/png;base64,') });
  });

  it('refuses to run when the key is not configured', async () => {
    delete process.env.OPENAI_API_KEY;
    const { req, res, status } = mockReqRes({ prompt: 'x' });
    await (await handler())(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a missing prompt', async () => {
    const { req, res, status } = mockReqRes({});
    await (await handler())(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an oversized prompt rather than paying for it', async () => {
    const { req, res, status } = mockReqRes({ prompt: 'a'.repeat(801) });
    await (await handler())(req, res);

    expect(status).toHaveBeenCalledWith(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never forwards the upstream error body to the client', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'invalid api key sk-openai-realkey' } }),
    });

    const { req, res, status, json } = mockReqRes({ prompt: 'x' });
    await (await handler())(req, res);

    expect(status).toHaveBeenCalledWith(502);
    expect(JSON.stringify(json.mock.calls)).not.toContain('sk-openai-realkey');
  });

  it('surfaces rate limiting as a retryable 429', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    const { req, res, status } = mockReqRes({ prompt: 'x' });
    await (await handler())(req, res);

    expect(status).toHaveBeenCalledWith(429);
  });

  it('502s when the upstream is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    const { req, res, status } = mockReqRes({ prompt: 'x' });
    await (await handler())(req, res);

    expect(status).toHaveBeenCalledWith(502);
  });

  it('502s when the upstream returns no image data', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [] }) });
    const { req, res, status } = mockReqRes({ prompt: 'x' });
    await (await handler())(req, res);

    expect(status).toHaveBeenCalledWith(502);
  });

  it('rejects a non-POST method', async () => {
    const req = { method: 'GET', headers: {} } as unknown as VercelRequest;
    const json = vi.fn();
    const res = { status: vi.fn(() => ({ json })) } as unknown as VercelResponse;

    await (await handler())(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
