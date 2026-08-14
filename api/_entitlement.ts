import { createClient } from '@supabase/supabase-js';

/** Statuses that grant access. Mirrors ENTITLED_STATUSES in lib/supabase.ts. */
const ENTITLED = ['trialing', 'active'];

/**
 * Shared entitlement check for every endpoint that spends money on an
 * upstream API. Admins skip the paywall, matching the client gate; everyone
 * else needs a subscription in an entitled status. Both agent-turn and
 * chapter-image call this — the model, book-summarization, and image-generation
 * endpoints all have the same trust requirement even though they hit
 * different upstreams.
 */
export async function isEntitled(userId: string, email: string): Promise<boolean> {
  const admins = (process.env.VITE_ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  if (admins.includes(email.toLowerCase())) return true;

  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await db
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .in('status', ENTITLED)
    .maybeSingle();

  return !!data;
}
