-- Run this in the Supabase SQL editor or via `supabase db push`.
--
-- Switches the paywall from a monthly subscription to a single one-time
-- purchase ("pay once, keep it").
--
-- A one-time payment has no subscription id and no billing period, so it does
-- not fit the `subscriptions` table: both `stripe_subscription_id` and
-- `current_period_end` are NOT NULL there. Access is now a row in `purchases`.
--
-- `public.subscriptions` is left in place but is no longer read or written by
-- the app. It is empty; drop it once you are satisfied nothing else needs it:
--   drop table public.subscriptions;

create table if not exists public.purchases (
  -- One purchase per account: buying twice does not grant anything extra, and
  -- this makes the entitlement lookup a primary-key hit.
  user_id                   uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id        text,
  -- The idempotency key. Stripe can deliver the same event more than once, and
  -- both checkout.session.completed and payment_intent.succeeded describe the
  -- same payment, so writes upsert on user_id and this stays unique per charge.
  stripe_payment_intent_id  text not null unique,
  stripe_checkout_session_id text,
  amount_total              integer not null,
  currency                  text not null default 'usd',
  status                    text not null default 'paid' check (status in ('paid', 'refunded')),
  created_at                timestamptz not null default now()
);

create index if not exists purchases_status_idx on public.purchases(status);

alter table public.purchases enable row level security;

-- Users can see their own purchase and nothing else. Writes come only from the
-- Stripe webhook, which uses the service role key and bypasses RLS.
create policy "Users can read own purchase"
  on public.purchases for select
  using (auth.uid() = user_id);

create policy "Service role can manage purchases"
  on public.purchases for all
  using (auth.role() = 'service_role');

-- Point the analytics summary at purchases instead of subscriptions, and rename
-- the final funnel stage to match the new event name.
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
          (5, 'purchase_completed')
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
        'customers', (select count(*) from public.purchases where status = 'paid'),
        'revenue',   (select coalesce(sum(amount_total), 0) from public.purchases where status = 'paid')
      )
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.analytics_summary(integer) from public, anon;
grant execute on function public.analytics_summary(integer) to authenticated;
