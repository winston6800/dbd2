-- Run this in the Supabase SQL editor or via `supabase db push`.
--
-- Adds X/Twitter as a third tracked platform alongside YouTube and Twitch.
-- Confirmed the existing constraint's name against the live project before
-- writing this (pg_get_constraintdef on public.watch_time):
--   watch_time_platform_check: CHECK ((platform = ANY (ARRAY['youtube', 'twitch'])))

alter table public.watch_time drop constraint watch_time_platform_check;
alter table public.watch_time add constraint watch_time_platform_check
  check (platform in ('youtube', 'twitch', 'x'));
