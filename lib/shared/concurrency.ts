/**
 * Runs `worker` over `items` with at most `limit` in flight at once.
 *
 * Used to process a book's chapters without either serializing them (a
 * 20-chapter book would take forever, one summarize-then-illustrate round
 * trip at a time) or firing all of them at once (which would slam both the
 * Anthropic and OpenAI endpoints simultaneously and mostly just trip rate
 * limits). A failed item does not stop the others — the caller decides what a
 * per-item failure means, this only owns the scheduling.
 */
export async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;

  async function lane(): Promise<void> {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => lane()));
}
