-- Run this in the Supabase SQL editor or via `supabase db push`.
--
-- Cross-device sync for the growth data that has always lived only in
-- localStorage: streaks, loops, screen time, skills, and everything else on
-- UserState except journalEntries (which already has its own table,
-- journal_entries, and its own sync path in lib/growth/journal.ts).
--
-- Mirrors localStorage's own shape rather than a normalized schema: one
-- JSONB blob per user, same as the `dbd_state_v1:<userId>` key already
-- holds client-side. The signed-in client reads and writes its own row
-- directly through RLS, the same pattern sync_tokens and journal_entries
-- already use — no service-role endpoint needed.

create table public.user_state (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  state       jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.user_state enable row level security;

create policy "Users can manage their own state"
  on public.user_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
