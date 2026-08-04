const NAME_SUFFIX = ['grath', 'oloth', 'zub', 'ryx', 'thrum', 'gorn', 'axil', 'umbra', 'vex', 'quor'];
const NAME_TITLE = ['the Endless', 'the Unfinished', 'the Dreadful', 'the Looming', 'the Stubborn', 'the Nagging'];
const STOPWORDS = ['the', 'a', 'an', 'to', 'of', 'for', 'and', 'my', 'in', 'on', 'do', 'get', 'make'];

/** Sum of char codes — the hash the design uses for every deterministic pick. */
export function charSum(text: string, seed = 0): number {
  return String(text || '')
    .split('')
    .reduce((a, c) => a + c.charCodeAt(0), seed);
}

/**
 * Deterministic local monster name: longest non-stopword root truncated to 6
 * chars, capitalised, plus a hash-picked suffix and title.
 */
export function localMonsterName(text: string): string {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w && !STOPWORDS.includes(w));
  const root = (words.sort((a, b) => b.length - a.length)[0] || 'task').slice(0, 6);
  const seed = charSum(text);
  const base = root.charAt(0).toUpperCase() + root.slice(1) + NAME_SUFFIX[seed % NAME_SUFFIX.length];
  return `${base} ${NAME_TITLE[seed % NAME_TITLE.length]}`;
}

/**
 * Hook for an AI-generated boss name. The design calls for the local name to
 * render immediately and be replaced when (if) a nicer name resolves — a failed
 * or slow call must never block the UI, so this always resolves and never
 * throws.
 *
 * No LLM provider is wired up in this project yet; returning `null` keeps the
 * local name. Point this at an endpoint to turn the feature on.
 */
export async function aiMonsterName(_text: string): Promise<string | null> {
  return null;
}

/** Trim/clean a raw model completion into a usable boss name, or reject it. */
export function sanitizeAiName(raw: unknown): string | null {
  const clean = String(raw ?? '')
    .split('\n')[0]
    .replace(/^["'\s]+|["'.\s]+$/g, '');
  return clean && clean.length <= 40 ? clean : null;
}
