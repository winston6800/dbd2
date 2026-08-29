import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const PLATFORMS = ['youtube', 'twitch', 'x'] as const;
type Platform = (typeof PLATFORMS)[number];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Caps one write at 30 minutes — the heartbeat interval is 1 minute, so
 *  anything bigger than that is a bug or an abusive token, not real watch
 *  time. */
const MAX_SECONDS_PER_WRITE = 1800;

/**
 * Adds watch-time seconds reported by the browser extension.
 *
 * The extension has no Supabase session of its own — it authenticates with
 * an opaque per-account token from `sync_tokens` instead (copied once from
 * Profile into the extension). This looks the token up with the service role
 * key, which is the only way to bypass RLS and translate it to a user id;
 * the caller never gets to say whose row it is writing.
 *
 * `seconds` is a delta the extension has not yet confirmed as synced, not a
 * running total — the upsert adds it to whatever is already stored for that
 * user/date/platform, so a slightly-too-frequent retry only double-counts a
 * few seconds rather than replacing the day's total.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const header = req.headers.authorization;
  const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '').trim() : '';
  if (!token) return res.status(401).json({ error: 'Missing sync token' });

  const { platform, seconds, date } = req.body ?? {};

  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'platform must be "youtube", "twitch", or "x"' });
  }
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0 || seconds > MAX_SECONDS_PER_WRITE) {
    return res.status(400).json({ error: `seconds must be a number between 1 and ${MAX_SECONDS_PER_WRITE}` });
  }
  if (typeof date !== 'string' || !DATE_RE.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }

  const { data: tokenRow, error: tokenError } = await supabase
    .from('sync_tokens')
    .select('user_id')
    .eq('token', token)
    .maybeSingle();

  if (tokenError || !tokenRow) return res.status(401).json({ error: 'Invalid sync token' });

  const { error } = await supabase.rpc('add_watch_time', {
    p_user_id: tokenRow.user_id,
    p_date: date,
    p_platform: platform as Platform,
    p_seconds: Math.round(seconds),
  });

  if (error) return res.status(500).json({ error: 'Failed to record watch time' });

  return res.status(200).json({ ok: true });
}
