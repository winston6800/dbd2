-- Run this in Supabase SQL editor or via `supabase db push`

create table if not exists public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id      text not null,
  stripe_subscription_id  text not null unique,
  status                  text not null check (status in ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
  current_period_end      timestamptz not null,
  created_at              timestamptz not null default now()
);

-- Index for fast per-user lookups
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);

-- Enable Row Level Security
alter table public.subscriptions enable row level security;

-- Users can only read their own subscription
create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Only service role can insert/update (webhooks use service role key)
create policy "Service role can manage subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');
