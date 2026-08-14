-- Run this in the Supabase SQL editor or via `supabase db push`.
--
-- Chapters' book libraries. One row per user holds the whole library as JSON —
-- every book, its chapters, their summaries and generated images. Mirrors the
-- shape of 002_goals.sql / 006_nets.sql for the same reason: always read and
-- written whole, so there is nothing to gain from normalising it into
-- books/chapters tables.
--
-- Chapter images are inline base64 data URIs (no storage bucket wired up
-- yet), so this table's rows run larger than goals/nets — a handful of
-- illustrated books can be several MB. Acceptable for now; the natural next
-- step if libraries grow is moving images to Supabase Storage and keeping
-- only a URL here.

create table if not exists public.libraries (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  state       jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.libraries enable row level security;

create policy "Users can read own library"
  on public.libraries for select
  using (auth.uid() = user_id);

create policy "Users can insert own library"
  on public.libraries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own library"
  on public.libraries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own library"
  on public.libraries for delete
  using (auth.uid() = user_id);
