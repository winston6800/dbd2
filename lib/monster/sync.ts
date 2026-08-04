import { supabase } from '../supabase';
import type { PersistedState } from './types';
import { clearState, loadState, saveState } from './storage';

/**
 * Board persistence: localStorage is the fast local cache, Supabase is the
 * source of truth across devices.
 *
 * Reads prefer the cloud and fall back to local, so a network blip degrades to
 * the old device-local behaviour rather than an empty board. Writes go to
 * localStorage synchronously (so nothing is lost if the tab closes) and to
 * Supabase in the background.
 */

export async function fetchRemoteState(userId: string): Promise<PersistedState | null> {
  const { data, error } = await supabase.from('goals').select('state').eq('user_id', userId).maybeSingle();
  if (error || !data?.state) return null;
  const state = data.state as PersistedState;
  if (!state.goal) return null;
  return { goal: state.goal, activeIndex: state.activeIndex || 0 };
}

export async function pushRemoteState(userId: string, state: PersistedState): Promise<boolean> {
  const { error } = await supabase
    .from('goals')
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  return !error;
}

/**
 * Loads a user's board, healing the two states a returning user can be in:
 * a board that only exists in the cloud (new device), or one that only exists
 * locally (signed up before sync existed) — which gets uploaded on the spot.
 */
export async function loadBoard(userId: string): Promise<PersistedState | null> {
  const local = loadState(userId);
  const remote = await fetchRemoteState(userId);

  if (remote) {
    saveState(userId, remote);
    return remote;
  }

  if (local?.goal) {
    void pushRemoteState(userId, local);
    return local;
  }

  return null;
}

/**
 * Saves locally at once and to the cloud on a trailing debounce, so working
 * through a task list is a handful of writes rather than one per keystroke.
 */
export function createBoardSaver(userId: string, delayMs = 800) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: PersistedState | null = null;

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending) return;
    const state = pending;
    pending = null;
    void pushRemoteState(userId, state);
  };

  return {
    save(state: PersistedState) {
      saveState(userId, state);
      pending = state;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    /** Called on unmount and on tab hide so in-flight edits are not dropped. */
    flush,
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}

export { clearState };
