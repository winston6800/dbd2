import { describe, expect, it } from 'vitest';
import { buildSummarySystemPrompt, parseChapterSummary, truncateChapterText, CHAPTER_TEXT_LIMIT } from './summarize';

describe('buildSummarySystemPrompt', () => {
  it('carries the book title and source heading into the prompt', () => {
    const prompt = buildSummarySystemPrompt('Thinking, Fast and Slow', 'Chapter 3');
    expect(prompt).toContain('Thinking, Fast and Slow');
    expect(prompt).toContain('Chapter 3');
  });

  it('specifies the exact JSON contract the parser expects', () => {
    const prompt = buildSummarySystemPrompt('Book', 'Chapter 1');
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"summary"');
    expect(prompt).toContain('"imagePrompt"');
  });
});

describe('truncateChapterText', () => {
  it('leaves short text untouched', () => {
    expect(truncateChapterText('short')).toBe('short');
  });

  it('caps long text at the limit and marks the cut', () => {
    const long = 'a'.repeat(CHAPTER_TEXT_LIMIT + 500);
    const truncated = truncateChapterText(long);
    expect(truncated.length).toBeLessThan(long.length);
    expect(truncated).toContain('[chapter truncated for length]');
  });
});

describe('parseChapterSummary', () => {
  it('parses a clean JSON reply', () => {
    const raw = '{"title": "The Trolley Problem", "summary": "Body.", "imagePrompt": "A fork in the tracks."}';
    expect(parseChapterSummary(raw, 'Chapter 1')).toEqual({
      title: 'The Trolley Problem',
      summary: 'Body.',
      imagePrompt: 'A fork in the tracks.',
    });
  });

  it('tolerates a markdown-fenced reply', () => {
    const raw = '```json\n{"title": "T", "summary": "S", "imagePrompt": "I"}\n```';
    expect(parseChapterSummary(raw, 'Chapter 1')).toEqual({ title: 'T', summary: 'S', imagePrompt: 'I' });
  });

  it('tolerates a stray sentence before the JSON', () => {
    const raw = 'Here you go:\n{"title": "T", "summary": "S", "imagePrompt": "I"}';
    expect(parseChapterSummary(raw, 'Chapter 1').title).toBe('T');
  });

  it('falls back to the source heading when title is missing', () => {
    const raw = '{"summary": "S", "imagePrompt": "I"}';
    expect(parseChapterSummary(raw, 'Chapter 7').title).toBe('Chapter 7');
  });

  it('fills a generic image prompt when the field is missing', () => {
    const raw = '{"title": "T", "summary": "S"}';
    expect(parseChapterSummary(raw, 'Chapter 1').imagePrompt).toContain('T');
  });

  it('treats the whole reply as the summary when JSON parsing fails entirely', () => {
    const raw = 'The model just wrote prose instead of JSON, no braces here.';
    const result = parseChapterSummary(raw, 'Chapter 4');
    expect(result.title).toBe('Chapter 4');
    expect(result.summary).toBe(raw);
  });

  it('falls back when braces are present but the interior is not valid JSON', () => {
    const raw = 'Some text { this is not json } more text';
    const result = parseChapterSummary(raw, 'Chapter 4');
    expect(result.summary).toBe(raw);
  });

  it('falls back when summary is present but not a string', () => {
    const raw = '{"title": "T", "summary": 42}';
    expect(parseChapterSummary(raw, 'Chapter 1').summary).toBe(raw);
  });
});
