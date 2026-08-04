-- Run this in the Supabase SQL editor or via `supabase db push`.
--
-- Board state used to live only in localStorage, so a paying user who switched
-- devices found an empty board. One row per user holds the whole board as JSON;
-- the shape is small (a goal, its mini-bosses and their tasks) and is always
-- read and written whole, so there is nothing to gain from normalising it.

create table if not exists public.goals (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  state       jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.goals enable row level security;

-- Users can read and write their own board, and nobody else's.
create policy "Users can read own goals"
  on public.goals for select
  using (auth.uid() = user_id);

create policy "Users can insert own goals"
  on public.goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own goals"
  on public.goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own goals"
  on public.goals for delete
  using (auth.uid() = user_id);
