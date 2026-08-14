import type { LibraryState } from './types';
import { EMPTY_LIBRARY } from './types';

/**
 * Local cache of the library, scoped per signed-in user — same reasoning as
 * lib/net/storage.ts. One real difference here: chapter images are inline
 * base64 data URIs (no bucket/CDN wired up yet), so a library with a few
 * illustrated books can run to several MB. localStorage's ~5-10MB ceiling is
 * the practical limit on library size until images move to real storage —
 * writes fail past that, and saveLibrary swallows the failure rather than
 * crashing the reading session, exactly like the board and net before it.
 */

const PREFIX = 'bookLibraryState';

export function storageKey(userId: string | null | undefined): string {
  return userId ? `${PREFIX}:${userId}` : PREFIX;
}

export function normalize(raw: unknown): LibraryState | null {
  if (!raw || typeof raw !== 'object') return null;
  const state = raw as Partial<LibraryState>;
  if (!Array.isArray(state.books)) return null;

  const books = state.books.filter(b => b && typeof b.id === 'string' && Array.isArray(b.chapters));
  const activeBookId = books.some(b => b.id === state.activeBookId) ? state.activeBookId! : (books[0]?.id ?? null);

  return { books, activeBookId };
}

export function loadLibrary(userId: string | null | undefined): LibraryState | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveLibrary(userId: string | null | undefined, state: LibraryState): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    /* quota or private mode — the session still works, it just will not persist */
  }
}

export function clearLibrary(userId: string | null | undefined): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}

export { EMPTY_LIBRARY };
