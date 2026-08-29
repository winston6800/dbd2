-- Run this in the Supabase SQL editor or via `supabase db push`.
--
-- Closes a real hole in 006: add_watch_time is `security definer` (it has to
-- be, to bypass RLS and increment another row than the caller's own) but had
-- no internal authorization check of its own — unlike analytics_summary,
-- which checks the caller's email before returning anything. Supabase grants
-- EXECUTE on new public-schema functions to anon/authenticated by default,
-- which meant anyone holding the public anon key could call
-- /rest/v1/rpc/add_watch_time directly with any p_user_id and credit
-- themselves (or grief someone else) arbitrary watch time, completely
-- bypassing the sync-token check in api/track-watch-time.ts.
--
-- Only the service role (used by that endpoint) should ever be able to call
-- this. Verified after applying:
--   select has_function_privilege('service_role', 'public.add_watch_time(uuid,date,text,integer)', 'EXECUTE'); -- true
--   select has_function_privilege('anon', 'public.add_watch_time(uuid,date,text,integer)', 'EXECUTE');         -- false
--   select has_function_privilege('authenticated', 'public.add_watch_time(uuid,date,text,integer)', 'EXECUTE'); -- false

revoke execute on function public.add_watch_time(uuid, date, text, integer) from public;
revoke execute on function public.add_watch_time(uuid, date, text, integer) from anon;
revoke execute on function public.add_watch_time(uuid, date, text, integer) from authenticated;
