import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

/**
 * The endpoints that act on "the current user" (checkout, billing portal)
 * used to trust a `userId` in the request body. Since the Supabase anon key
 * is public, that let anyone POST any userId and get back a stranger's
 * billing portal link, or overwrite a stranger's subscription row via the
 * webhook. This asserts the fix: identity comes only from a verified session
 * token, and a missing/invalid one is always rejected.
 */

let getUserResult: { data: { user: { id: string; email: string } | null }; error: unknown };

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: async () => getUserResult },
  }),
}));

import { getAuthenticatedUser } from '../api/_auth';

function reqWith(authorization?: string): VercelRequest {
  return { headers: authorization ? { authorization } : {} } as unknown as VercelRequest;
}

describe('getAuthenticatedUser', () => {
  beforeEach(() => {
    getUserResult = { data: { user: { id: 'user-1', email: 'real@example.com' } }, error: null };
  });

  it('returns the verified identity for a valid bearer token', async () => {
    const user = await getAuthenticatedUser(reqWith('Bearer good-token'));
    expect(user).toEqual({ id: 'user-1', email: 'real@example.com' });
  });

  it('rejects a missing Authorization header', async () => {
    expect(await getAuthenticatedUser(reqWith(undefined))).toBeNull();
  });

  it('rejects an empty bearer token', async () => {
    expect(await getAuthenticatedUser(reqWith('Bearer '))).toBeNull();
  });

  it('rejects a token Supabase cannot verify', async () => {
    getUserResult = { data: { user: null }, error: { message: 'invalid JWT' } };
    expect(await getAuthenticatedUser(reqWith('Bearer forged-or-expired'))).toBeNull();
  });

  it('rejects a verified session with no email', async () => {
    // Should not happen for a password-auth user, but the endpoints require an
    // email (Stripe's customer_email), so refuse rather than pass through empty.
    getUserResult = { data: { user: { id: 'user-1', email: '' } }, error: null };
    expect(await getAuthenticatedUser(reqWith('Bearer good-token'))).toBeNull();
  });

  it('never trusts anything from the request body', async () => {
    const req = {
      headers: { authorization: 'Bearer good-token' },
      body: { userId: 'attacker-supplied-victim-id', email: 'victim@example.com' },
    } as unknown as VercelRequest;

    const user = await getAuthenticatedUser(req);

    // The identity must come from the token, never from body.userId/email.
    expect(user).toEqual({ id: 'user-1', email: 'real@example.com' });
  });
});
