let counter = 0;

/**
 * Collision-free ids for bosses and tasks.
 *
 * A bare timestamp is not enough: two tasks added in the same millisecond would
 * share an id, and since tasks are looked up by id, the second one could never
 * be completed. The suffix also keeps React keys unique.
 *
 * Ids feed the deterministic face/tint/pellet hashes, so once assigned an id
 * must never change — it is what keeps a monster looking like itself.
 */
export function uid(prefix: string): string {
  counter += 1;
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}-${counter}-${rand}`;
}
