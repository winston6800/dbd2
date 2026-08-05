import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export interface Subscription {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  price_id: string | null;
  trial_end: string | null;
  current_period_end: string | null;
  /** True once the user has cancelled; access lasts until current_period_end. */
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

/** The two statuses that grant access. Mirrors ENTITLED_STATUSES on the server. */
const ENTITLED: SubscriptionStatus[] = ['trialing', 'active'];

/**
 * Returns the subscription only when it currently grants access. A cancelled
 * subscription still counts until the period ends — Stripe keeps the status
 * `active` with `cancel_at_period_end` set until then.
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ENTITLED)
    .maybeSingle();
  if (error) return null;
  return data;
}

export function isTrialing(sub: Subscription | null): boolean {
  return sub?.status === 'trialing';
}

/** Whole days left in the trial, floored at 0. */
export function trialDaysLeft(sub: Subscription | null): number {
  if (!sub?.trial_end) return 0;
  const ms = new Date(sub.trial_end).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
