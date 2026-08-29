import { supabase } from '../supabase';

/**
 * Screen-time sync, reported by the companion browser extension
 * (`extension/`) rather than typed in by hand.
 *
 * The extension has no Supabase session of its own — it runs in a background
 * service worker with no interactive sign-in — so it authenticates writes
 * with an opaque per-account token instead. That token lives in
 * `sync_tokens`, generated and read here with the signed-in user's own
 * client: RLS scopes every row to `auth.uid()`, so this never needs a server
 * endpoint of its own.
 */

export interface TodayScreenTime {
  youtubeSeconds: number;
  twitchSeconds: number;
  xSeconds: number;
}

/** en-CA gives YYYY-MM-DD, the same convention `lib/growth/storage.ts` uses for streak dates. */
function today(): string {
  return new Date().toLocaleDateString('en-CA');
}

/**
 * Returns the user's sync token, generating and storing one on first call.
 * This is the string that goes into the extension's popup.
 */
export async function getOrCreateSyncToken(userId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('sync_tokens')
    .select('token')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing?.token) return existing.token;

  const token =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now()}${Math.random().toString(36).slice(2)}`;

  const { data: inserted, error } = await supabase
    .from('sync_tokens')
    .insert({ user_id: userId, token })
    .select('token')
    .single();

  // Another tab may have generated one in the gap between the select and the
  // insert above — the unique constraint on user_id rejects the second
  // insert, so fall back to reading whichever one won.
  if (error) {
    const { data: retry } = await supabase.from('sync_tokens').select('token').eq('user_id', userId).maybeSingle();
    return retry?.token ?? null;
  }

  return inserted?.token ?? null;
}

/** Replaces the stored token with a freshly generated one, invalidating the old one. */
export async function regenerateSyncToken(userId: string): Promise<string | null> {
  const token =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now()}${Math.random().toString(36).slice(2)}`;

  const { data, error } = await supabase
    .from('sync_tokens')
    .upsert({ user_id: userId, token }, { onConflict: 'user_id' })
    .select('token')
    .single();
  if (error) return null;
  return data?.token ?? null;
}

export async function fetchTodayScreenTime(userId: string): Promise<TodayScreenTime> {
  const { data } = await supabase
    .from('watch_time')
    .select('platform, seconds')
    .eq('user_id', userId)
    .eq('date', today());

  const result: TodayScreenTime = { youtubeSeconds: 0, twitchSeconds: 0, xSeconds: 0 };
  for (const row of data ?? []) {
    if (row.platform === 'youtube') result.youtubeSeconds = row.seconds;
    else if (row.platform === 'twitch') result.twitchSeconds = row.seconds;
    else if (row.platform === 'x') result.xSeconds = row.seconds;
  }
  return result;
}
