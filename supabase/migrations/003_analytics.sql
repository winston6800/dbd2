-- Run this in the Supabase SQL editor or via `supabase db push`.
--
-- Launch analytics. The question this exists to answer on day one of a traffic
-- push is: how many people landed, how many started checkout, and where did
-- they come from.

create table if not exists public.analytics_events (
  id          bigint generated always as identity primary key,
  event       text not null,
  -- Anonymous visitors have no user_id; the session id is what ties a landing
  -- view to the signup that follows it.
  user_id     uuid references auth.users(id) on delete set null,
  session_id  text not null,
  referrer    text,
  utm_source  text,
  path        text,
  props       jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists analytics_events_created_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_event_idx on public.analytics_events(event);
create index if not exists analytics_events_session_idx on public.analytics_events(session_id);

alter table public.analytics_events enable row level security;

-- Anyone may record an event — landing views happen before sign-in, so this has
-- to accept anonymous writes. Nobody may read the raw table: reads go through
-- analytics_summary() below, which checks the caller is an admin.
-- Note the trade-off: an open insert policy means the endpoint can be spammed.
-- That is acceptable for a launch; add a rate limit or an edge function if the
-- numbers ever start looking wrong.
create policy "Anyone can record an event"
  on public.analytics_events for insert
  to anon, authenticated
  with check (true);

-- Who is allowed to read the dashboard. Add yourself:
--   insert into public.admin_emails (email) values ('you@example.com');
create table if not exists public.admin_emails (
  email       text primary key,
  created_at  timestamptz not null default now()
);

alter table public.admin_emails enable row level security;
-- No policies: the table is unreadable and unwritable through the API. Only
-- the security-definer function below and the service role can see it.

/**
 * Aggregated dashboard data. Security definer so it can read the events table
 * that RLS otherwise closes off, with an explicit admin check at the top so
 * that power is not handed to every signed-in user.
 */
create or replace function public.analytics_summary(days integer default 14)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text;
  since        timestamptz;
  result       jsonb;
begin
  caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if not exists (
    select 1 from public.admin_emails where lower(email) = caller_email
  ) then
    raise exception 'not authorized';
  end if;

  -- Clamp so a caller cannot ask for an unbounded scan.
  days := least(greatest(coalesce(days, 14), 1), 90);
  since := now() - make_interval(days => days);

  select jsonb_build_object(
    'days', days,

    -- One row per funnel stage, counted in distinct sessions so a visitor who
    -- reloads five times is still one person.
    'funnel', coalesce((
      select jsonb_agg(x order by x.ord)
      from (
        select s.ord, s.event,
               (select count(distinct e.session_id)
                  from public.analytics_events e
                 where e.event = s.event and e.created_at >= since) as sessions
        from (values
          (1, 'landing_view'),
          (2, 'landing_cta_click'),
          (3, 'signup_completed'),
          (4, 'checkout_started'),
          (5, 'subscription_active')
        ) as s(ord, event)
      ) x
    ), '[]'::jsonb),

    -- Distinct visitors per day, zero-filled so the chart has no gaps.
    'daily', coalesce((
      select jsonb_agg(x order by x.day)
      from (
        select d.day::date as day,
               (select count(distinct e.session_id)
                  from public.analytics_events e
                 where e.created_at >= d.day
                   and e.created_at < d.day + interval '1 day') as visitors,
               (select count(distinct e.session_id)
                  from public.analytics_events e
                 where e.event = 'signup_completed'
                   and e.created_at >= d.day
                   and e.created_at < d.day + interval '1 day') as signups
        from generate_series(date_trunc('day', since), date_trunc('day', now()), interval '1 day') d(day)
      ) x
    ), '[]'::jsonb),

    -- Where the traffic came from. utm_source wins when present, otherwise the
    -- referrer's host; a direct visit has neither.
    'referrers', coalesce((
      select jsonb_agg(x order by x.sessions desc)
      from (
        select coalesce(
                 nullif(e.utm_source, ''),
                 nullif(regexp_replace(coalesce(e.referrer, ''), '^https?://(www\.)?([^/]+).*$', '\2'), ''),
                 'direct'
               ) as source,
               count(distinct e.session_id) as sessions
        from public.analytics_events e
        where e.created_at >= since
        group by 1
        order by sessions desc
        limit 8
      ) x
    ), '[]'::jsonb),

    'totals', (
      select jsonb_build_object(
        'visitors',    (select count(distinct session_id) from public.analytics_events where created_at >= since),
        'signups',     (select count(distinct session_id) from public.analytics_events where event = 'signup_completed' and created_at >= since),
        'checkouts',   (select count(distinct session_id) from public.analytics_events where event = 'checkout_started' and created_at >= since),
        'subscribers', (select count(*) from public.subscriptions where status in ('active', 'trialing'))
      )
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.analytics_summary(integer) from public, anon;
grant execute on function public.analytics_summary(integer) to authenticated;
