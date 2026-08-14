import { supabase } from '../supabase';
import type { LibraryState } from './types';
import { clearLibrary, loadLibrary, normalize, saveLibrary } from './storage';

/**
 * Library persistence, mirroring lib/net/sync.ts: localStorage is the fast
 * local cache, Supabase is the source of truth across devices.
 */

export async function fetchRemoteLibrary(userId: string): Promise<LibraryState | null> {
  const { data, error } = await supabase.from('libraries').select('state').eq('user_id', userId).maybeSingle();
  if (error || !data?.state) return null;
  return normalize(data.state);
}

export async function pushRemoteLibrary(userId: string, state: LibraryState): Promise<boolean> {
  const { error } = await supabase
    .from('libraries')
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  return !error;
}

export async function loadLibraryFor(userId: string): Promise<LibraryState | null> {
  const local = loadLibrary(userId);
  const remote = await fetchRemoteLibrary(userId);

  if (remote) {
    saveLibrary(userId, remote);
    return remote;
  }

  if (local) {
    void pushRemoteLibrary(userId, local);
    return local;
  }

  return null;
}

/**
 * Saves locally at once and to the cloud on a trailing debounce. The debounce
 * matters more here than for the net: the pipeline writes a status change per
 * chapter per stage, and without it a 12-chapter book would fire a dozen
 * uncoalesced network writes in the time it takes to click through the upload.
 */
export function createLibrarySaver(userId: string, delayMs = 900) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: LibraryState | null = null;

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending) return;
    const state = pending;
    pending = null;
    void pushRemoteLibrary(userId, state);
  };

  return {
    save(state: LibraryState) {
      saveLibrary(userId, state);
      pending = state;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    flush,
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}

export { clearLibrary };
