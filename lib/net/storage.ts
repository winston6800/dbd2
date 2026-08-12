import type { NetState } from './types';
import { EMPTY_NET } from './types';

/**
 * Local cache of the net, scoped per signed-in user so switching accounts on a
 * shared machine does not leak one person's thinking into another's canvas.
 */

const PREFIX = 'frontierNetState';

export function storageKey(userId: string | null | undefined): string {
  return userId ? `${PREFIX}:${userId}` : PREFIX;
}

/** Defensive: a hand-edited or half-migrated blob must not white-screen the app. */
export function normalize(raw: unknown): NetState | null {
  if (!raw || typeof raw !== 'object') return null;
  const state = raw as Partial<NetState>;
  if (!state.plot || !Array.isArray(state.nodes) || state.nodes.length === 0) return null;

  const nodes = state.nodes
    .filter(n => n && typeof n.id === 'string')
    .map(n => ({
      ...n,
      messages: Array.isArray(n.messages) ? n.messages : [],
      forks: Array.isArray(n.forks) ? n.forks : [],
      links: Array.isArray(n.links) ? n.links : [],
      resolved: !!n.resolved,
      parentId: n.parentId ?? null,
    }));

  if (!nodes.length) return null;

  // An activeId pointing at a deleted node would open an empty panel.
  const activeId = nodes.some(n => n.id === state.activeId) ? state.activeId! : nodes[0].id;

  return { plot: state.plot, nodes, activeId };
}

export function loadNet(userId: string | null | undefined): NetState | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveNet(userId: string | null | undefined, state: NetState): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    /* quota or private mode — the session still works, it just will not persist */
  }
}

export function clearNet(userId: string | null | undefined): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}

export { EMPTY_NET };
