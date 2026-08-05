import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  getSubscription,
  isTrialing,
  supabase,
  trialDaysLeft,
  type Subscription,
  type SubscriptionStatus,
} from './supabase';

/**
 * Exercises the real `getSubscription` against a stubbed query builder, so the
 * status filter it sends to Postgres is asserted rather than assumed. That
 * filter is the entitlement rule.
 */

let requestedStatuses: string[] = [];
let row: Subscription | null = null;

beforeEach(() => {
  requestedStatuses = [];
  row = null;
  vi.spyOn(supabase, 'from').mockReturnValue({
    select: () => ({
      eq: () => ({
        in: (_column: string, statuses: string[]) => {
          requestedStatuses = statuses;
          return { maybeSingle: async () => ({ data: row, error: null }) };
        },
      }),
    }),
  } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function sub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    user_id: 'u1',
    stripe_customer_id: 'cus_1',
    stripe_subscription_id: 'sub_1',
    status: 'trialing' as SubscriptionStatus,
    price_id: 'price_1',
    trial_end: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    current_period_end: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    cancel_at_period_end: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('getSubscription', () => {
  it('only asks for the statuses that grant access', async () => {
    await getSubscription('u1');
    // past_due, canceled, unpaid and incomplete must never grant entitlement.
    expect(requestedStatuses).toEqual(['trialing', 'active']);
  });

  it('grants access during the trial', async () => {
    row = sub({ status: 'trialing' });
    expect(await getSubscription('u1')).not.toBeNull();
  });

  it('grants access after the trial converts', async () => {
    row = sub({ status: 'active', trial_end: new Date(Date.now() - 1000).toISOString() });
    expect(await getSubscription('u1')).not.toBeNull();
  });

  it('keeps access for a cancelled subscription until the period ends', async () => {
    // Stripe keeps the status `active` with cancel_at_period_end set until the
    // subscription actually lapses — the user paid for this period.
    row = sub({ status: 'active', cancel_at_period_end: true });
    const found = await getSubscription('u1');
    expect(found).not.toBeNull();
    expect(found!.cancel_at_period_end).toBe(true);
  });

  it('returns null when nothing entitled comes back', async () => {
    row = null;
    expect(await getSubscription('u1')).toBeNull();
  });
});

describe('trial helpers', () => {
  it('detects a trial', () => {
    expect(isTrialing(sub({ status: 'trialing' }))).toBe(true);
    expect(isTrialing(sub({ status: 'active' }))).toBe(false);
    expect(isTrialing(null)).toBe(false);
  });

  it('counts whole days left, floored at zero', () => {
    expect(trialDaysLeft(sub({ trial_end: new Date(Date.now() + 3 * 86_400_000).toISOString() }))).toBe(3);
    expect(trialDaysLeft(sub({ trial_end: new Date(Date.now() - 86_400_000).toISOString() }))).toBe(0);
    expect(trialDaysLeft(sub({ trial_end: null }))).toBe(0);
    expect(trialDaysLeft(null)).toBe(0);
  });
});
