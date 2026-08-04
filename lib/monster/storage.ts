import type { PersistedState } from './types';

const STORAGE_PREFIX = 'monsterGoalsAppState';

/**
 * State is scoped per signed-in user so switching accounts on a shared device
 * doesn't leak one person's goal into another's board.
 *
 * This is still device-local. Moving it to a Supabase-backed `goals` table is
 * the natural next step now that every session is authenticated.
 */
export function storageKey(userId: string | null | undefined): string {
  return userId ? `${STORAGE_PREFIX}:${userId}` : STORAGE_PREFIX;
}

export function loadState(userId: string | null | undefined): PersistedState | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState | null;
    if (!parsed || !parsed.goal) return null;
    return { goal: parsed.goal, activeIndex: parsed.activeIndex || 0 };
  } catch {
    return null;
  }
}

export function saveState(userId: string | null | undefined, state: PersistedState): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    /* quota or private mode — the board still works for this session */
  }
}

export function clearState(userId: string | null | undefined): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}
