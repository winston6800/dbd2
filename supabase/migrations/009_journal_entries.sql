-- Run this in the Supabase SQL editor or via `supabase db push`.
--
-- Capacity Journal sync. Unlike watch_time (written by a browser extension
-- with no Supabase session), the journal is written by the signed-in user's
-- own client, so it can read and write its own rows directly through RLS —
-- the same pattern sync_tokens uses — with no service-role endpoint needed.

create table public.journal_entries (
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- Local calendar date, 'YYYY-MM-DD' — same convention as the app's own
  -- streak dates and watch_time.
  entry_date  date not null,
  entry_text  text not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, entry_date)
);

alter table public.journal_entries enable row level security;

create policy "Users can manage their own journal entries"
  on public.journal_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
