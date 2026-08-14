/**
 * Turns one chapter's raw text into the model request/response contract:
 * a title, an engaging summary, and a prompt for the chapter's illustration.
 *
 * Pure string-in, string/object-out — no fetch here, so the prompt wording and
 * the parsing of what comes back can be tested without a network call or a
 * live Anthropic key.
 */

/** Characters of chapter text sent to the model. Bounds cost on a long chapter. */
export const CHAPTER_TEXT_LIMIT = 14_000;

export interface ChapterSummary {
  title: string;
  summary: string;
  imagePrompt: string;
}

export function buildSummarySystemPrompt(bookTitle: string, sourceHeading: string): string {
  return `You are turning one chapter of a book into content someone would actually stop scrolling for.

The book is "${bookTitle}". This chapter was headed "${sourceHeading}" in the source, but that heading
is often generic — replace it with a real title once you have read the chapter.

Write:
- title: A specific, concrete title for this chapter (not "${sourceHeading}"). Under 8 words.
- summary: 3 short paragraphs. Open with the chapter's single most surprising or useful claim, not
  scene-setting. Write like a sharp human explaining the idea to a smart friend, not like a back-cover
  blurb — no "in this chapter, the author explores...". Name the actual argument, example, or mechanism.
  If the chapter is thin or mostly transitional, say that plainly rather than padding it.
- imagePrompt: A single concrete visual scene that captures this chapter's central idea, written as an
  instruction to an image model. Describe a specific subject, setting, and mood — not an abstract
  concept, not text, not a diagram, not a book cover. One scene, not a collage. Under 50 words.

Respond with ONLY a JSON object, no other text, no markdown fence:
{"title": "...", "summary": "...", "imagePrompt": "..."}`;
}

export function truncateChapterText(text: string): string {
  if (text.length <= CHAPTER_TEXT_LIMIT) return text;
  return `${text.slice(0, CHAPTER_TEXT_LIMIT)}\n\n[chapter truncated for length]`;
}

/**
 * Tolerant JSON parse: models fence JSON in ```json blocks or add a stray
 * sentence before it more often than they emit it raw, so this looks for the
 * outermost braces rather than trusting the whole reply to be valid JSON.
 */
export function parseChapterSummary(raw: string, fallbackTitle: string): ChapterSummary {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');

  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<ChapterSummary>;
      if (typeof parsed.summary === 'string' && parsed.summary.trim()) {
        const title = typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : fallbackTitle;
        return {
          title,
          summary: parsed.summary.trim(),
          imagePrompt:
            typeof parsed.imagePrompt === 'string' && parsed.imagePrompt.trim()
              ? parsed.imagePrompt.trim()
              : genericImagePrompt(title),
        };
      }
    } catch {
      // fall through to the plain-text fallback below
    }
  }

  return { title: fallbackTitle, summary: raw.trim(), imagePrompt: genericImagePrompt(fallbackTitle) };
}

function genericImagePrompt(title: string): string {
  return `An abstract, atmospheric illustration evoking the theme of "${title}", muted colour palette, no text.`;
}
