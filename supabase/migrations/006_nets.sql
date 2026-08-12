-- Run this in the Supabase SQL editor or via `supabase db push`.
--
-- Frontier nets. One row per user holds the whole net as JSON: the plot, its
-- conversation nodes, their transcripts and forks. Like the goals table this is
-- always read and written whole, so there is nothing to gain from normalising
-- it into nodes/messages tables — and a lot to lose, since every save would
-- become a multi-statement transaction.
--
-- A net is far more valuable than the board it replaces (it is hours of the
-- user's thinking), so this table is additive: 002_goals.sql is left in place
-- rather than dropped, and no data is migrated between them.

create table if not exists public.nets (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  state       jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.nets enable row level security;

-- Users can read and write their own net, and nobody else's.
create policy "Users can read own net"
  on public.nets for select
  using (auth.uid() = user_id);

create policy "Users can insert own net"
  on public.nets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own net"
  on public.nets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own net"
  on public.nets for delete
  using (auth.uid() = user_id);
