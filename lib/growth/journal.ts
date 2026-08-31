import { supabase } from '../supabase';

/**
 * Capacity Journal sync. Unlike watch_time (written by a browser extension
 * with no Supabase session of its own), the journal is written by the
 * signed-in user's own client, so it reads and writes its own rows directly
 * through RLS — the same pattern `sync_tokens` uses — with no server
 * endpoint needed. This is what makes an entry written on one device show
 * up on another, instead of staying stuck in that device's localStorage.
 */

export async function fetchJournalEntries(userId: string): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('journal_entries')
    .select('entry_date, entry_text')
    .eq('user_id', userId);

  const entries: Record<string, string> = {};
  for (const row of data ?? []) {
    entries[row.entry_date] = row.entry_text;
  }
  return entries;
}

/** Upserts a day's entry, or deletes it when the text is cleared out. */
export async function saveJournalEntry(userId: string, date: string, text: string): Promise<void> {
  if (!text.trim()) {
    await supabase.from('journal_entries').delete().eq('user_id', userId).eq('entry_date', date);
    return;
  }
  await supabase
    .from('journal_entries')
    .upsert({ user_id: userId, entry_date: date, entry_text: text, updated_at: new Date().toISOString() }, { onConflict: 'user_id,entry_date' });
}
