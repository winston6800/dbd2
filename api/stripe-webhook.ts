import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getStripe, getStripeConfig } from './_stripe.js';

export const config = { api: { bodyParser: false } };

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Unix seconds → ISO, tolerating the nulls Stripe uses for "not applicable". */
function toIso(seconds: number | null | undefined): string | null {
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null;
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

/**
 * `current_period_end` moved from the subscription to its items in Stripe API
 * v17+. Read whichever is present so the row is right on both.
 */
function periodEnd(sub: Stripe.Subscription): string | null {
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  const fromItem = (sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined)
    ?.current_period_end;
  return toIso(fromItem ?? legacy ?? null);
}

/**
 * Mirrors a Stripe subscription into our table. Every lifecycle event funnels
 * through here, so the row is always the latest truth: trialing at signup,
 * active once the first invoice is paid, cancel_at_period_end when the user
 * cancels, canceled when the period finally ends.
 *
 * Upserts on user_id — one subscription per account — which also makes
 * redelivered events harmless.
 */
export async function syncSubscription(
  db: SupabaseClient,
  userId: string,
  sub: Stripe.Subscription,
): Promise<void> {
  await db.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: idOf(sub.customer as string | { id: string }),
      stripe_subscription_id: sub.id,
      status: sub.status,
      price_id: sub.items?.data?.[0]?.price?.id ?? null,
      trial_end: toIso(sub.trial_end),
      current_period_end: periodEnd(sub),
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

/**
 * Resolves the user a subscription belongs to. The id is stamped into metadata
 * at checkout; if an event somehow arrives without it, fall back to the row we
 * already have rather than dropping the update on the floor.
 */
async function resolveUserId(
  db: SupabaseClient,
  sub: Stripe.Subscription,
): Promise<string | null> {
  const fromMetadata = sub.metadata?.userId;
  if (fromMetadata) return fromMetadata;

  const { data } = await db
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', sub.id)
    .maybeSingle();
  return data?.user_id ?? null;
}

/**
 * The lifecycle, isolated from HTTP and signature checking so it can be driven
 * directly by tests.
 */
export async function handleStripeEvent(
  event: Stripe.Event,
  deps: { db: SupabaseClient; fetchSubscription: (id: string) => Promise<Stripe.Subscription> },
): Promise<void> {
  const { db, fetchSubscription } = deps;

  switch (event.type) {
    // Trial starts here: Checkout completes, the subscription exists in
    // `trialing`, and no money has moved yet.
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') break;
      const userId = session.metadata?.userId;
      const subscriptionId = idOf(session.subscription as string | { id: string });
      if (!userId || !subscriptionId) break;

      await syncSubscription(db, userId, await fetchSubscription(subscriptionId));
      break;
    }

    // Covers trialing → active when the first invoice is paid, the user
    // cancelling (cancel_at_period_end), resuming, and going past_due.
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.paused':
    case 'customer.subscription.resumed': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await resolveUserId(db, sub);
      if (!userId) break;
      await syncSubscription(db, userId, sub);
      break;
    }

    // The period has actually ended. Access stops now, not when they clicked
    // cancel.
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await db
        .from('subscriptions')
        .update({
          status: 'canceled',
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', sub.id);
      break;
    }

    // Trial is about to convert (Stripe sends this ~3 days out; on a 3-day
    // trial it lands almost immediately). Logged as the hook for a reminder
    // email.
    case 'customer.subscription.trial_will_end': {
      const sub = event.data.object as Stripe.Subscription;
      console.info('Trial ending soon', { subscription: sub.id, trialEnd: toIso(sub.trial_end) });
      break;
    }

    // The renewal charge failed. Stripe has already moved the subscription to
    // past_due; re-read it so our status matches rather than guessing.
    case 'invoice.payment_failed':
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = idOf(
        (invoice as unknown as { subscription?: string | { id: string } }).subscription,
      );
      if (!subscriptionId) break;
      const sub = await fetchSubscription(subscriptionId);
      const userId = await resolveUserId(db, sub);
      if (!userId) break;
      await syncSubscription(db, userId, sub);
      break;
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeConfig = getStripeConfig();
  const stripe = getStripe(stripeConfig);
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const sig = req.headers['stripe-signature'] as string;
  const rawBody = await getRawBody(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, stripeConfig.webhookSecret);
  } catch {
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    await handleStripeEvent(event, {
      db,
      fetchSubscription: id => stripe.subscriptions.retrieve(id) as unknown as Promise<Stripe.Subscription>,
    });
  } catch (err) {
    // A 500 makes Stripe retry, which is what we want for a transient failure.
    console.error('Webhook handling failed', { type: event.type, id: event.id, err });
    return res.status(500).json({ error: 'Webhook handling failed' });
  }

  return res.status(200).json({ received: true });
}
