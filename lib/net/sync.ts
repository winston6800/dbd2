import { supabase } from '../supabase';
import type { NetState } from './types';
import { clearNet, loadNet, normalize, saveNet } from './storage';

/**
 * Net persistence, mirroring the board's model: localStorage is the fast local
 * cache, Supabase is the source of truth across devices.
 *
 * A net is worth much more than a game board was — it is hours of thinking —
 * so writes go to localStorage synchronously and to Supabase on a debounce,
 * and reads degrade to local rather than to empty when the network is down.
 */

export async function fetchRemoteNet(userId: string): Promise<NetState | null> {
  const { data, error } = await supabase.from('nets').select('state').eq('user_id', userId).maybeSingle();
  if (error || !data?.state) return null;
  return normalize(data.state);
}

export async function pushRemoteNet(userId: string, state: NetState): Promise<boolean> {
  const { error } = await supabase
    .from('nets')
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  return !error;
}

/**
 * Loads a user's net, healing both states a returning user can be in: a net
 * that only exists in the cloud (new device), or one that only exists locally
 * (offline session that never flushed), which gets uploaded on the spot.
 */
export async function loadNetFor(userId: string): Promise<NetState | null> {
  const local = loadNet(userId);
  const remote = await fetchRemoteNet(userId);

  if (remote) {
    saveNet(userId, remote);
    return remote;
  }

  if (local) {
    void pushRemoteNet(userId, local);
    return local;
  }

  return null;
}

/**
 * Saves locally at once and to the cloud on a trailing debounce, so a fast
 * exchange with an agent is a couple of writes rather than one per token.
 */
export function createNetSaver(userId: string, delayMs = 900) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: NetState | null = null;

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending) return;
    const state = pending;
    pending = null;
    void pushRemoteNet(userId, state);
  };

  return {
    save(state: NetState) {
      saveNet(userId, state);
      pending = state;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    /** Called on unmount and on tab hide so in-flight thinking is not dropped. */
    flush,
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}

export { clearNet };
