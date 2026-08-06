import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * End-to-end check that the portal endpoint actually enforces the auth fix:
 * no session → rejected before touching Stripe or the database; a real
 * session → looks up *that* user's subscription, never one named in the body.
 */

let authResult: { id: string; email: string } | null = null;
let subscriptionRow: { stripe_customer_id: string } | null = null;
const portalCreate = vi.fn(async () => ({ url: 'https://billing.stripe.com/session/abc' }));

vi.mock('../api/_auth', () => ({
  getAuthenticatedUser: async () => authResult,
}));

vi.mock('../api/_stripe', () => ({
  getStripe: () => ({ billingPortal: { sessions: { create: portalCreate } } }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_col: string, value: string) => ({
          maybeSingle: async () => ({
            data: value === 'user-1' ? subscriptionRow : null,
          }),
        }),
      }),
    }),
  }),
}));

function mockReqRes(authorization?: string, body: unknown = { userId: 'not-me', email: 'x' }) {
  const req = { method: 'POST', headers: authorization ? { authorization } : {}, body } as unknown as VercelRequest;
  const json = vi.fn();
  const res = { status: vi.fn(() => ({ json })) } as unknown as VercelResponse;
  return { req, res, json, status: res.status as unknown as ReturnType<typeof vi.fn> };
}

describe('POST /api/create-portal-session', () => {
  beforeEach(() => {
    vi.resetModules();
    authResult = null;
    subscriptionRow = null;
    portalCreate.mockClear();
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('rejects a request with no valid session before touching Stripe', async () => {
    const handler = (await import('../api/create-portal-session')).default;
    const { req, res, status, json } = mockReqRes(undefined);

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Not signed in' });
    expect(portalCreate).not.toHaveBeenCalled();
  });

  it('looks up the authenticated user, ignoring any userId in the body', async () => {
    authResult = { id: 'user-1', email: 'real@example.com' };
    subscriptionRow = { stripe_customer_id: 'cus_real_owner' };
    const handler = (await import('../api/create-portal-session')).default;
    // Body claims a different account — must be ignored.
    const { req, res, json } = mockReqRes('Bearer good-token', { userId: 'someone-elses-id' });

    await handler(req, res);

    expect(portalCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_real_owner' }),
    );
    expect(json).toHaveBeenCalledWith({ url: 'https://billing.stripe.com/session/abc' });
  });

  it('404s when the authenticated user has no subscription', async () => {
    authResult = { id: 'user-1', email: 'real@example.com' };
    subscriptionRow = null;
    const handler = (await import('../api/create-portal-session')).default;
    const { req, res, status } = mockReqRes('Bearer good-token');

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(portalCreate).not.toHaveBeenCalled();
  });
});
