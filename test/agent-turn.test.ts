import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * /api/agent-turn holds the Anthropic key, so it is the only thing standing
 * between the public anon key and an unmetered inference farm on our card.
 * The client-side paywall is a UX affordance; this is the enforcement, so it
 * is asserted directly: no session or no subscription must mean no upstream
 * call at all.
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

function ok(text: string) {
  return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text }] }) };
}

function mockReqRes(body: unknown, authorization = 'Bearer good-token') {
  const req = { method: 'POST', headers: { authorization }, body } as unknown as VercelRequest;
  const json = vi.fn();
  const res = { status: vi.fn(() => ({ json })) } as unknown as VercelResponse;
  return { req, res, json, status: res.status as unknown as ReturnType<typeof vi.fn> };
}

const validBody = { system: 'You are the Cartographer.', messages: [{ role: 'user', content: 'go' }] };

async function handler() {
  return (await import('../api/agent-turn')).default;
}

describe('POST /api/agent-turn', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(ok('Prose.\n\nFORKS\n- adversary: T :: why'));
    authResult = { id: 'user-1', email: 'real@example.com' };
    subscriptionRow = { status: 'active' };
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.VITE_ADMIN_EMAILS = '';
  });

  it('returns the model text for an entitled caller', async () => {
    const { req, res, json } = mockReqRes(validBody);
    await (await handler())(req, res);

    expect(json).toHaveBeenCalledWith({ text: 'Prose.\n\nFORKS\n- adversary: T :: why' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rejects an unauthenticated caller before spending a token', async () => {
    authResult = null;
    const { req, res, status } = mockReqRes(validBody);
    await (await handler())(req, res);

    expect(status).toHaveBeenCalledWith(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a signed-in caller with no entitled subscription', async () => {
    subscriptionRow = null;
    const { req, res, status, json } = mockReqRes(validBody);
    await (await handler())(req, res);

    expect(status).toHaveBeenCalledWith(402);
    expect(json).toHaveBeenCalledWith({ error: 'No active subscription' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lets an admin email through without a subscription', async () => {
    subscriptionRow = null;
    process.env.VITE_ADMIN_EMAILS = 'Real@Example.com';
    const { req, res, json } = mockReqRes(validBody);
    await (await handler())(req, res);

    expect(json).toHaveBeenCalledWith({ text: expect.any(String) });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('refuses to run when the key is not configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { req, res, status } = mockReqRes(validBody);
    await (await handler())(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed message list', async () => {
    const { req, res, status } = mockReqRes({ system: 'x', messages: [{ role: 'system', content: 'nope' }] });
    await (await handler())(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an oversized conversation rather than paying for it', async () => {
    const { req, res, status } = mockReqRes({
      system: 'x',
      messages: [{ role: 'user', content: 'a'.repeat(12_001) }],
    });
    await (await handler())(req, res);

    expect(status).toHaveBeenCalledWith(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never forwards the upstream error body to the client', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'invalid x-api-key sk-ant-realkey' } }),
    });

    const { req, res, status, json } = mockReqRes(validBody);
    await (await handler())(req, res);

    expect(status).toHaveBeenCalledWith(502);
    expect(JSON.stringify(json.mock.calls)).not.toContain('sk-ant-realkey');
  });

  it('surfaces rate limiting as a retryable 429', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    const { req, res, status } = mockReqRes(validBody);
    await (await handler())(req, res);

    expect(status).toHaveBeenCalledWith(429);
  });

  it('502s when the upstream is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    const { req, res, status } = mockReqRes(validBody);
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
