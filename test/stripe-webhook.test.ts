import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import { handleStripeEvent } from '../api/stripe-webhook';

/**
 * Drives the real webhook handler through a full subscription lifecycle using
 * Stripe's event shapes: trial start → conversion → cancel → lapse, plus the
 * failure and redelivery paths.
 *
 * This proves our handling is correct. It does not talk to Stripe, so it
 * cannot prove Stripe's side — that needs `stripe trigger` or a real test-mode
 * checkout against a deployed preview.
 */

const USER = 'user-abc';
const SUB_ID = 'sub_123';
const CUSTOMER = 'cus_123';
const DAY = 86_400;

/** A minimal in-memory stand-in for the one table the handler writes. */
function fakeDb() {
  const rows = new Map<string, Record<string, unknown>>();

  const api = {
    rows,
    row: () => rows.get(USER),
    from(_table: string) {
      return {
        upsert(values: Record<string, unknown>) {
          const key = values.user_id as string;
          rows.set(key, { ...(rows.get(key) ?? {}), ...values });
          return Promise.resolve({ error: null });
        },
        update(values: Record<string, unknown>) {
          return {
            eq(column: string, value: unknown) {
              for (const [key, row] of rows) {
                if (row[column] === value) rows.set(key, { ...row, ...values });
              }
              return Promise.resolve({ error: null });
            },
          };
        },
        select(_cols: string) {
          return {
            eq(column: string, value: unknown) {
              return {
                maybeSingle() {
                  const found = [...rows.values()].find(r => r[column] === value) ?? null;
                  return Promise.resolve({ data: found, error: null });
                },
              };
            },
          };
        },
      };
    },
  };
  return api as unknown as ReturnType<typeof fakeDb> & Parameters<typeof handleStripeEvent>[1]['db'];
}

function subscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: SUB_ID,
    customer: CUSTOMER,
    status: 'trialing',
    trial_end: now + 3 * DAY,
    cancel_at_period_end: false,
    metadata: { userId: USER },
    items: { data: [{ price: { id: 'price_test' }, current_period_end: now + 3 * DAY }] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

function event(type: string, object: unknown): Stripe.Event {
  return { id: `evt_${Math.random().toString(36).slice(2)}`, type, data: { object } } as Stripe.Event;
}

describe('subscription lifecycle', () => {
  let db: ReturnType<typeof fakeDb>;
  let current: Stripe.Subscription;
  let fetchSubscription: (id: string) => Promise<Stripe.Subscription>;

  beforeEach(() => {
    db = fakeDb();
    current = subscription();
    fetchSubscription = vi.fn(async () => current);
  });

  const run = (type: string, object: unknown) =>
    handleStripeEvent(event(type, object), { db, fetchSubscription });

  it('starts the trial on checkout — access granted, nothing charged yet', async () => {
    await run('checkout.session.completed', {
      mode: 'subscription',
      subscription: SUB_ID,
      metadata: { userId: USER },
    });

    const row = db.row()!;
    expect(row.user_id).toBe(USER);
    expect(row.status).toBe('trialing');
    expect(row.stripe_subscription_id).toBe(SUB_ID);
    expect(row.trial_end).toBeTruthy();
    expect(row.cancel_at_period_end).toBe(false);
  });

  it('ignores a one-time checkout', async () => {
    await run('checkout.session.completed', {
      mode: 'payment',
      subscription: null,
      metadata: { userId: USER },
    });
    expect(db.row()).toBeUndefined();
  });

  it('converts the trial to active when the first invoice is paid', async () => {
    await run('checkout.session.completed', {
      mode: 'subscription',
      subscription: SUB_ID,
      metadata: { userId: USER },
    });
    expect(db.row()!.status).toBe('trialing');

    // Trial ends: Stripe charges the card and flips the status.
    const now = Math.floor(Date.now() / 1000);
    current = subscription({
      status: 'active',
      trial_end: now,
      items: { data: [{ price: { id: 'price_test' }, current_period_end: now + 30 * DAY }] },
    } as Partial<Stripe.Subscription>);

    await run('customer.subscription.updated', current);

    const row = db.row()!;
    expect(row.status).toBe('active');
    expect(new Date(row.current_period_end as string).getTime()).toBeGreaterThan(Date.now());
  });

  it('keeps access alive between cancelling and the period actually ending', async () => {
    await run('checkout.session.completed', {
      mode: 'subscription',
      subscription: SUB_ID,
      metadata: { userId: USER },
    });

    // The user cancels in the billing portal.
    current = subscription({ status: 'active', cancel_at_period_end: true } as Partial<Stripe.Subscription>);
    await run('customer.subscription.updated', current);

    let row = db.row()!;
    expect(row.cancel_at_period_end).toBe(true);
    // Still entitled — they paid for this period.
    expect(row.status).toBe('active');

    // The period ends.
    await run('customer.subscription.deleted', subscription({ status: 'canceled' } as Partial<Stripe.Subscription>));

    row = db.row()!;
    expect(row.status).toBe('canceled');
    expect(row.cancel_at_period_end).toBe(false);
  });

  it('marks past_due when the renewal charge fails', async () => {
    await run('checkout.session.completed', {
      mode: 'subscription',
      subscription: SUB_ID,
      metadata: { userId: USER },
    });

    current = subscription({ status: 'past_due' } as Partial<Stripe.Subscription>);
    await run('invoice.payment_failed', { subscription: SUB_ID });

    expect(db.row()!.status).toBe('past_due');
  });

  it('cancels a trial that ends with no payment method', async () => {
    await run('checkout.session.completed', {
      mode: 'subscription',
      subscription: SUB_ID,
      metadata: { userId: USER },
    });

    await run('customer.subscription.deleted', subscription({ status: 'canceled' } as Partial<Stripe.Subscription>));
    expect(db.row()!.status).toBe('canceled');
  });

  it('is idempotent — a redelivered event does not duplicate or regress the row', async () => {
    const checkout = {
      mode: 'subscription',
      subscription: SUB_ID,
      metadata: { userId: USER },
    };
    await run('checkout.session.completed', checkout);
    await run('checkout.session.completed', checkout);
    await run('customer.subscription.created', current);

    expect(db.rows.size).toBe(1);
    expect(db.row()!.status).toBe('trialing');
  });

  it('attributes an event whose metadata is missing via the stored row', async () => {
    await run('checkout.session.completed', {
      mode: 'subscription',
      subscription: SUB_ID,
      metadata: { userId: USER },
    });

    // Stripe omits metadata on some generated events.
    await run(
      'customer.subscription.updated',
      subscription({ status: 'active', metadata: {} } as Partial<Stripe.Subscription>),
    );

    expect(db.rows.size).toBe(1);
    expect(db.row()!.status).toBe('active');
  });

  it('does not write when the user cannot be resolved at all', async () => {
    await run(
      'customer.subscription.updated',
      subscription({ id: 'sub_unknown', metadata: {} } as Partial<Stripe.Subscription>),
    );
    expect(db.rows.size).toBe(0);
  });

  it('reads current_period_end from the item (Stripe API v17+)', async () => {
    const now = Math.floor(Date.now() / 1000);
    current = subscription({
      status: 'active',
      items: { data: [{ price: { id: 'price_test' }, current_period_end: now + 30 * DAY }] },
    } as Partial<Stripe.Subscription>);

    await run('customer.subscription.updated', current);

    const end = new Date(db.row()!.current_period_end as string).getTime();
    expect(Math.round((end - Date.now()) / 1000 / DAY)).toBe(30);
  });

  it('logs the trial_will_end warning without touching entitlement', async () => {
    await run('checkout.session.completed', {
      mode: 'subscription',
      subscription: SUB_ID,
      metadata: { userId: USER },
    });
    const before = { ...db.row() };

    await run('customer.subscription.trial_will_end', current);

    expect(db.row()).toEqual(before);
  });
});
