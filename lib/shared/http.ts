import { supabase } from '../supabase';

/**
 * Every paid endpoint (agent-turn, chapter-image, and whatever comes next)
 * needs the same three things: attach the session token, refuse to fire with
 * no session, and turn a non-2xx into a typed error with the server's message
 * rather than a generic "fetch failed." One place for that instead of one per
 * endpoint client.
 */

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function authedPost<T>(path: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError('Your session expired — sign in again', 401);

  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(errBody.error ?? 'Request failed', res.status);
  }

  return (await res.json()) as T;
}
