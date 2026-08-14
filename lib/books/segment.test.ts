import { describe, expect, it } from 'vitest';
import { segmentText } from './segment';

/**
 * This runs before any model call, so its mistakes are free to make and
 * expensive to ship: a false split just makes a chapter run short, but eating
 * a table of contents as forty one-line "chapters" would summarize a page of
 * page numbers forty times.
 */

const lorem = (n: number, seed = 'w') => Array.from({ length: n }, (_, i) => `${seed}${i}`).join(' ');

describe('segmentText', () => {
  it('returns nothing for empty input', () => {
    expect(segmentText('')).toEqual([]);
    expect(segmentText('   \n\n  ')).toEqual([]);
  });

  it('treats a short text as one chapter rather than fragmenting it', () => {
    const text = lorem(400);
    const chapters = segmentText(text);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].heading).toBe('Full text');
    expect(chapters[0].wordCount).toBe(400);
  });

  it('splits on real chapter headings with real spacing between them', () => {
    const text = ['Chapter 1', lorem(1000, 'a'), 'Chapter 2', lorem(1000, 'b'), 'Chapter 3', lorem(1000, 'c')].join(
      '\n',
    );

    const chapters = segmentText(text);

    expect(chapters).toHaveLength(3);
    expect(chapters.map(c => c.heading)).toEqual(['Chapter 1', 'Chapter 2', 'Chapter 3']);
    expect(chapters[0].text).toContain('a0');
    expect(chapters[0].text).not.toContain('b0');
    expect(chapters[1].text).toContain('b0');
  });

  it('keeps a heading subtitle when the source includes one', () => {
    const text = ['Chapter 1: The Beginning', lorem(1000, 'a'), 'Chapter 2: The Middle', lorem(1000, 'b')].join('\n');
    expect(segmentText(text)[0].heading).toBe('Chapter 1: The Beginning');
  });

  it('collapses a dense table of contents instead of reading each line as a chapter', () => {
    const toc = Array.from({ length: 12 }, (_, i) => `Chapter ${i + 1}`).join('\n');
    const text = [
      toc,
      'Chapter 1',
      lorem(1000, 'a'),
      'Chapter 2',
      lorem(1000, 'b'),
      'Chapter 3',
      lorem(1000, 'c'),
    ].join('\n');

    const chapters = segmentText(text);

    // The ToC block itself yields at most its first line as a heading; the
    // real, properly-spaced chapters after it are what should dominate.
    expect(chapters.length).toBeLessThanOrEqual(4);
    expect(chapters.some(c => c.text.includes('a500'))).toBe(true);
    expect(chapters.some(c => c.text.includes('c500'))).toBe(true);
  });

  it('falls back to fixed-size chunks when only one heading is found', () => {
    const text = ['Chapter 1', lorem(9000)].join('\n');
    const chapters = segmentText(text);

    expect(chapters.length).toBeGreaterThan(1);
    expect(chapters.every(c => c.heading.startsWith('Part '))).toBe(true);
  });

  it('falls back to fixed-size chunks when heading count is implausibly high', () => {
    const many = Array.from({ length: 200 }, (_, i) => `Chapter ${i + 1}\n${lorem(300, `c${i}-`)}`).join('\n');
    const chapters = segmentText(many);

    expect(chapters.every(c => c.heading.startsWith('Part '))).toBe(true);
  });

  it('preserves front matter before the first heading as an introduction', () => {
    const text = [lorem(400, 'front'), 'Chapter 1', lorem(1000, 'a'), 'Chapter 2', lorem(1000, 'b')].join('\n');
    const chapters = segmentText(text);

    expect(chapters[0].heading).toBe('Introduction');
    expect(chapters[0].text).toContain('front0');
    expect(chapters[1].heading).toBe('Chapter 1');
  });

  it('drops negligible front matter rather than creating a near-empty chapter', () => {
    const text = ['ok', 'Chapter 1', lorem(1000, 'a'), 'Chapter 2', lorem(1000, 'b')].join('\n');
    expect(segmentText(text)[0].heading).toBe('Chapter 1');
  });

  it('indexes chapters contiguously from 1', () => {
    const text = [lorem(400, 'front'), 'Chapter 1', lorem(1000, 'a'), 'Chapter 2', lorem(1000, 'b')].join('\n');
    expect(segmentText(text).map(c => c.index)).toEqual([1, 2, 3]);
  });

  it('accounts for every word exactly once across fixed-size chunks', () => {
    const chapters = segmentText(lorem(10000));
    const total = chapters.reduce((sum, c) => sum + c.wordCount, 0);
    expect(total).toBe(10000);
  });

  it('accounts for every word exactly once across heading-based chapters', () => {
    const text = ['Chapter 1', lorem(1000, 'a'), 'Chapter 2', lorem(1000, 'b'), 'Chapter 3', lorem(1000, 'c')].join(
      '\n',
    );
    const chapters = segmentText(text);
    const total = chapters.reduce((sum, c) => sum + c.wordCount, 0);
    expect(total).toBe(3000);
  });
});
