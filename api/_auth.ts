import type { VercelRequest } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Verifies the caller's Supabase session and returns the real, server-trusted
 * identity behind it.
 *
 * Endpoints that act on "the current user" must never take a userId from the
 * request body — the anon key is public, so anyone can POST any userId they
 * like. This checks the bearer token's signature against Supabase's auth
 * server instead, so the id it returns cannot be spoofed.
 */
export async function getAuthenticatedUser(
  req: VercelRequest,
): Promise<{ id: string; email: string } | null> {
  const header = req.headers.authorization;
  const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '').trim() : '';
  if (!token) return null;

  // The anon key is fine here — this call validates the token, it does not
  // need elevated privileges.
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) return null;

  return { id: data.user.id, email: data.user.email };
}
