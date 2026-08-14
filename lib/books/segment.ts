/**
 * Splits raw extracted book text into chapters, without any model call.
 *
 * This runs before a single token is spent, so it has to be conservative: a
 * false split just makes one chapter oddly short, but if it splits nothing at
 * all every downstream summary tries to cover an entire book, which is where
 * "engaging chapter summary" quietly turns into "vague blurb."
 *
 * Strategy: look for heading lines ("Chapter 7", "Part III"), and require real
 * spacing between accepted ones. A table of contents lists every heading in a
 * few lines with almost no words between them, so the min-gap filter collapses
 * that block down to (at most) its first entry rather than reading it as forty
 * one-line chapters. If too few real headings survive, fall back to fixed-size
 * chunks — worse chapter boundaries, but every book still gets summarized
 * instead of failing outright.
 */

export interface ChapterDraft {
  index: number;
  heading: string;
  text: string;
  wordCount: number;
}

const HEADING_RE = /^(chapter|part|book|section)\s+([0-9]+|[ivxlcdm]+)\b[:.]?\s*(.{0,60})$/i;
const MIN_GAP_WORDS = 250;
const MAX_HEADING_CHAPTERS = 60;
const FALLBACK_CHUNK_WORDS = 3200;
const MIN_TOTAL_WORDS_TO_SPLIT = 900;

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

interface Candidate {
  wordOffset: number;
  /** Where this chapter's own body starts — past the heading line's words. */
  contentOffset: number;
  heading: string;
}

function findHeadingCandidates(lines: string[]): Candidate[] {
  const candidates: Candidate[] = [];
  let wordOffset = 0;

  for (const raw of lines) {
    const line = raw.trim();
    const lineWords = words(line).length;
    const match = line.length <= 80 ? line.match(HEADING_RE) : null;
    if (match) {
      const label = `${capitalize(match[1])} ${match[2].toUpperCase()}`;
      const rest = match[3]?.trim();
      candidates.push({
        wordOffset,
        contentOffset: wordOffset + lineWords,
        heading: rest ? `${label}: ${rest}` : label,
      });
    }
    wordOffset += lineWords;
  }

  return candidates;
}

function capitalize(word: string): string {
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

/** Drops candidates packed too close together — the signature of a table of contents. */
function filterByGap(candidates: Candidate[]): Candidate[] {
  const kept: Candidate[] = [];
  for (const c of candidates) {
    const prev = kept[kept.length - 1];
    if (!prev || c.wordOffset - prev.wordOffset >= MIN_GAP_WORDS) kept.push(c);
  }
  return kept;
}

function byFixedChunks(allWords: string[]): ChapterDraft[] {
  const chapters: ChapterDraft[] = [];
  for (let start = 0, index = 1; start < allWords.length; start += FALLBACK_CHUNK_WORDS, index++) {
    const chunk = allWords.slice(start, start + FALLBACK_CHUNK_WORDS);
    chapters.push({ index, heading: `Part ${index}`, text: chunk.join(' '), wordCount: chunk.length });
  }
  return chapters;
}

export function segmentText(fullText: string): ChapterDraft[] {
  const normalized = fullText.replace(/\r\n/g, '\n');
  const allWords = words(normalized);

  if (allWords.length < MIN_TOTAL_WORDS_TO_SPLIT) {
    return allWords.length ? [{ index: 1, heading: 'Full text', text: normalized.trim(), wordCount: allWords.length }] : [];
  }

  const lines = normalized.split('\n');
  const candidates = filterByGap(findHeadingCandidates(lines));

  const usable = candidates.length >= 2 && candidates.length <= MAX_HEADING_CHAPTERS ? candidates : [];
  if (!usable.length) return byFixedChunks(allWords);

  // Slice the word stream between consecutive heading offsets. A chapter's
  // body starts at contentOffset (past its own heading's words) and runs to
  // the *next* heading's wordOffset (before that one's words) — so the
  // heading text itself belongs to neither chapter, rather than being double
  // counted into whichever chapter happened to start there.
  const chapters: ChapterDraft[] = [];
  for (let i = 0; i < usable.length; i++) {
    const start = usable[i].contentOffset;
    const end = i + 1 < usable.length ? usable[i + 1].wordOffset : allWords.length;
    const chunk = allWords.slice(start, end);
    if (!chunk.length) continue;
    chapters.push({ index: chapters.length + 1, heading: usable[i].heading, text: chunk.join(' '), wordCount: chunk.length });
  }

  // Everything before the first accepted heading (front matter, a preface) is
  // real content too — keep it rather than silently dropping it.
  if (usable[0].wordOffset > 0) {
    const front = allWords.slice(0, usable[0].wordOffset);
    if (front.length >= 200) {
      chapters.unshift({ index: 0, heading: 'Introduction', text: front.join(' '), wordCount: front.length });
      chapters.forEach((c, i) => (c.index = i + 1));
    }
  }

  return chapters.length ? chapters : byFixedChunks(allWords);
}
