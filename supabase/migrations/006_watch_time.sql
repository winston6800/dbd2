-- Run this in the Supabase SQL editor or via `supabase db push`.
--
-- Automatic YouTube/Twitch screen-time tracking, reported by the companion
-- browser extension (extension/) rather than typed in by hand.
--
-- The extension runs in a background service worker with no Supabase
-- session of its own — it cannot sign in interactively. Instead the user
-- copies a per-account sync token from Profile once, pastes it into the
-- extension, and the extension sends that token (not a Supabase JWT) with
-- every write. `sync_tokens` maps that opaque token back to a user id.

create table public.sync_tokens (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  token       text not null unique,
  created_at  timestamptz not null default now()
);

alter table public.sync_tokens enable row level security;

-- The token is generated and read entirely by the signed-in user's own
-- client (Profile screen) via the anon key + RLS — no server endpoint needed
-- for this half. Nobody can read or overwrite another user's token.
create policy "Users can manage their own sync token"
  on public.sync_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.watch_time (
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- Local calendar date on the machine doing the watching, 'YYYY-MM-DD' —
  -- same convention as the app's own streak dates, so a session that crosses
  -- midnight splits the same way a loop logged at 11:59pm would.
  date        date not null,
  platform    text not null check (platform in ('youtube', 'twitch')),
  seconds     integer not null default 0 check (seconds >= 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, date, platform)
);

create index if not exists watch_time_user_date_idx on public.watch_time(user_id, date);

alter table public.watch_time enable row level security;

-- Users can read their own history (for the Command-tab tile). They cannot
-- write it directly — only the service role can, via /api/track-watch-time,
-- which authenticates the write against sync_tokens instead of a Supabase
-- session. Letting the client write its own rows would let anyone with the
-- anon key credit themselves arbitrary screen time.
create policy "Users can read their own watch time"
  on public.watch_time for select
  using (auth.uid() = user_id);

create policy "Service role can manage watch time"
  on public.watch_time for all
  using (auth.role() = 'service_role');

-- Atomic add-and-upsert, called by /api/track-watch-time with the service
-- role. Doing this as a single statement (rather than select-then-write from
-- the function) avoids a lost update if two heartbeats land at once.
create or replace function public.add_watch_time(
  p_user_id uuid,
  p_date date,
  p_platform text,
  p_seconds integer
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.watch_time (user_id, date, platform, seconds)
  values (p_user_id, p_date, p_platform, p_seconds)
  on conflict (user_id, date, platform)
  do update set seconds = watch_time.seconds + excluded.seconds, updated_at = now();
$$;
