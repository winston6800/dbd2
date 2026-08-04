import { describe, expect, it } from 'vitest';
import { charSum, localMonsterName, sanitizeAiName } from './naming';

describe('localMonsterName', () => {
  it('builds a name from the longest non-stopword root', () => {
    // "mileage" is the longest word once stopwords are dropped, truncated to 6.
    expect(localMonsterName('Build base mileage')).toMatch(/^Mileag/);
  });

  it('is deterministic for the same input', () => {
    expect(localMonsterName('Learn Spanish')).toBe(localMonsterName('Learn Spanish'));
  });

  it('always appends a title', () => {
    const name = localMonsterName('Run a marathon');
    expect(name).toMatch(/ the (Endless|Unfinished|Dreadful|Looming|Stubborn|Nagging)$/);
  });

  it('falls back to a root when the input is all stopwords or empty', () => {
    expect(localMonsterName('the a an to')).toMatch(/^Task/);
    expect(localMonsterName('')).toMatch(/^Task/);
  });

  it('strips punctuation before picking a root', () => {
    expect(localMonsterName('Ship v2.0 — finally!')).not.toContain('—');
  });
});

describe('charSum', () => {
  it('is stable and seedable', () => {
    expect(charSum('ab')).toBe(97 + 98);
    expect(charSum('ab', 5)).toBe(97 + 98 + 5);
    expect(charSum('')).toBe(0);
  });
});

describe('sanitizeAiName', () => {
  it('trims quotes, trailing punctuation and extra lines', () => {
    expect(sanitizeAiName('"Grumblegorn the Vast."\nAnother line')).toBe('Grumblegorn the Vast');
  });

  it('rejects empty or overlong names', () => {
    expect(sanitizeAiName('')).toBeNull();
    expect(sanitizeAiName(null)).toBeNull();
    expect(sanitizeAiName('x'.repeat(41))).toBeNull();
  });
});
