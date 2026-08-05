-- Run this in the Supabase SQL editor or via `supabase db push`.
--
-- Back to a recurring subscription, now with a free trial.
--
-- The original `subscriptions` table (001) predates trials: it has no trial_end
-- and no cancel_at_period_end, requires current_period_end NOT NULL (a trialing
-- subscription may not have one yet), and allows several rows per user, which
-- makes "is this user entitled?" ambiguous. It is empty, so it is replaced
-- outright rather than patched.
--
-- `purchases` (004, the one-time model) is superseded and left empty in place.
-- Drop it once you are sure: drop table public.purchases;

drop table if exists public.subscriptions;

create table public.subscriptions (
  -- One subscription per account, so entitlement is a primary-key lookup and
  -- webhook writes can upsert safely on redelivery.
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id      text,
  stripe_subscription_id  text unique,
  -- Stripe's full status set. 'trialing' and 'active' are the two that grant
  -- access; the rest are recorded so the state is visible when debugging.
  status                  text not null check (status in (
                            'trialing', 'active', 'past_due', 'canceled',
                            'unpaid', 'incomplete', 'incomplete_expired', 'paused'
                          )),
  price_id                text,
  -- Null once the trial has converted or if there never was one.
  trial_end               timestamptz,
  -- Null is possible mid-trial, so this cannot be NOT NULL.
  current_period_end      timestamptz,
  -- True after the user cancels: they keep access until current_period_end,
  -- and Stripe sends customer.subscription.deleted when it actually lapses.
  cancel_at_period_end    boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists subscriptions_status_idx on public.subscriptions(status);
create index if not exists subscriptions_stripe_sub_idx on public.subscriptions(stripe_subscription_id);

alter table public.subscriptions enable row level security;

-- Users read their own row and nothing else. Writes come only from the Stripe
-- webhook via the service role key, which bypasses RLS.
create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Service role can manage subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');

-- Point the analytics summary back at subscriptions, splitting trials from paid
-- conversions — on a 3-day trial those are very different numbers.
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

  days := least(greatest(coalesce(days, 14), 1), 90);
  since := now() - make_interval(days => days);

  select jsonb_build_object(
    'days', days,
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
          (5, 'trial_started')
        ) as s(ord, event)
      ) x
    ), '[]'::jsonb),
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
        'visitors',  (select count(distinct session_id) from public.analytics_events where created_at >= since),
        'signups',   (select count(distinct session_id) from public.analytics_events where event = 'signup_completed' and created_at >= since),
        'checkouts', (select count(distinct session_id) from public.analytics_events where event = 'checkout_started' and created_at >= since),
        'trialing',  (select count(*) from public.subscriptions where status = 'trialing'),
        'active',    (select count(*) from public.subscriptions where status = 'active'),
        'cancelling',(select count(*) from public.subscriptions where cancel_at_period_end and status in ('trialing','active'))
      )
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.analytics_summary(integer) from public, anon;
grant execute on function public.analytics_summary(integer) to authenticated;
