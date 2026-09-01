import { supabase } from '../supabase';
import type { UserState } from './types';

/**
 * Cross-device sync for UserState — streaks, loops, screen time, skills,
 * and everything else except journalEntries (which has its own table and
 * its own sync path, lib/growth/journal.ts). The client reads and writes
 * its own row directly through RLS, the same pattern journal.ts uses: no
 * server endpoint needed since this is always the signed-in user's own
 * data, never written on someone else's behalf.
 *
 * Stored as one JSONB blob per user rather than a normalized schema — it
 * mirrors the shape localStorage already holds under `dbd_state_v1:<userId>`,
 * so there's one source of truth for what UserState looks like, not two.
 */

/** Fields with their own separate sync path — never read from or written to user_state. */
const EXCLUDED_KEYS = ['journalEntries'] as const;

type RemoteState = Omit<UserState, 'journalEntries'>;

export async function fetchRemoteState(userId: string): Promise<RemoteState | null> {
  const { data } = await supabase.from('user_state').select('state').eq('user_id', userId).maybeSingle();
  return (data?.state as RemoteState) ?? null;
}

export async function saveRemoteState(userId: string, state: UserState): Promise<void> {
  const toSave: Partial<UserState> = { ...state };
  for (const key of EXCLUDED_KEYS) delete toSave[key];
  await supabase
    .from('user_state')
    .upsert({ user_id: userId, state: toSave, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}

const DATE_KEYED_KEYS = ['dailyUvs', 'dailyGrowthActions', 'dailyInfrastructureFocus', 'dailyShipped', 'dailyShipNote', 'screenTimeLog'] as const;

function dedupeCaseInsensitive(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/**
 * Combines this device's local state with the account's remote state.
 * Date-keyed logs (loops, screen time, ...) merge per-date, remote winning
 * on overlap but keeping any date only present locally (an offline write
 * not yet synced). growthDates/skills union and dedupe, since both devices
 * can add to them independently. Everything else — settings like the
 * growth objective, theme, streak, stats — takes the remote value when
 * present, since those are single-value fields, not accumulating logs.
 * journalEntries is left untouched; it's owned by journal.ts.
 */
export function mergeRemoteState(local: UserState, remote: RemoteState | null): UserState {
  if (!remote) return local;

  const merged: UserState = { ...local, ...remote, journalEntries: local.journalEntries };

  for (const key of DATE_KEYED_KEYS) {
    merged[key] = { ...(local[key] as object | undefined), ...(remote[key] as object | undefined) } as never;
  }

  merged.growthDates = Array.from(new Set([...(local.growthDates || []), ...(remote.growthDates || [])]));
  merged.skills = dedupeCaseInsensitive([...(local.skills || []), ...(remote.skills || [])]);

  return merged;
}
