import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = { api: { bodyParser: false } };

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sig = req.headers['stripe-signature'] as string;
  const rawBody = await getRawBody(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') break;
      const userId = session.metadata?.userId;
      const subscriptionId = session.subscription as string;
      if (!userId || !subscriptionId) break;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await upsertSubscription(userId, session.customer as string, subscription);
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (!userId) break;
      await upsertSubscription(userId, subscription.customer as string, subscription);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }
  }

  return res.status(200).json({ received: true });
}

async function upsertSubscription(userId: string, customerId: string, sub: Stripe.Subscription) {
  // current_period_end moved to items in Stripe API v17+; fall back to billing_cycle_anchor
  const periodEndUnix =
    (sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined)?.current_period_end
    ?? sub.billing_cycle_anchor;

  await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    current_period_end: new Date(periodEndUnix * 1000).toISOString(),
  }, { onConflict: 'stripe_subscription_id' });
}
