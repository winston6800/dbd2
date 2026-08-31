import { beforeEach, describe, expect, it, vi } from 'vitest';

let journalRows: { entry_date: string; entry_text: string }[];
const upserts: { user_id: string; entry_date: string; entry_text: string }[] = [];
const deletes: { user_id: string; entry_date: string }[] = [];

vi.mock('../supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'journal_entries') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: async () => ({ data: journalRows, error: null }),
        }),
        upsert: (row: { user_id: string; entry_date: string; entry_text: string }) => {
          upserts.push(row);
          return Promise.resolve({ data: null, error: null });
        },
        delete: () => ({
          eq: (_col1: string, userId: string) => ({
            eq: (_col2: string, entryDate: string) => {
              deletes.push({ user_id: userId, entry_date: entryDate });
              return Promise.resolve({ data: null, error: null });
            },
          }),
        }),
      };
    },
  },
}));

import { fetchJournalEntries, saveJournalEntry } from './journal';

describe('fetchJournalEntries', () => {
  it('returns an empty map when nothing is recorded', async () => {
    journalRows = [];
    expect(await fetchJournalEntries('user-1')).toEqual({});
  });

  it('maps rows by date', async () => {
    journalRows = [
      { entry_date: '2026-08-29', entry_text: 'Shipped the journal sync.' },
      { entry_date: '2026-08-28', entry_text: 'Ran 6 miles.' },
    ];
    expect(await fetchJournalEntries('user-1')).toEqual({
      '2026-08-29': 'Shipped the journal sync.',
      '2026-08-28': 'Ran 6 miles.',
    });
  });
});

describe('saveJournalEntry', () => {
  beforeEach(() => {
    upserts.length = 0;
    deletes.length = 0;
  });

  it('upserts non-empty text', async () => {
    await saveJournalEntry('user-1', '2026-08-29', 'Shipped the journal sync.');
    expect(upserts).toHaveLength(1);
    expect(upserts[0]).toMatchObject({ user_id: 'user-1', entry_date: '2026-08-29', entry_text: 'Shipped the journal sync.' });
    expect(deletes).toHaveLength(0);
  });

  it('deletes the row when the text is cleared', async () => {
    await saveJournalEntry('user-1', '2026-08-29', '   ');
    expect(deletes).toHaveLength(1);
    expect(upserts).toHaveLength(0);
  });
});
