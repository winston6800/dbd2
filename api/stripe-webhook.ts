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

/**
 * Grants access on a one-time payment.
 *
 * Two of the subscribed events describe the same payment —
 * `checkout.session.completed` and `payment_intent.succeeded` — and Stripe can
 * redeliver either. `grantAccess` is therefore idempotent: it upserts on
 * user_id, so whichever arrives first wins and the rest are no-ops.
 */
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
      if (session.mode !== 'payment') break;
      // `unpaid` covers async methods that have not cleared yet; those arrive
      // later as payment_intent.succeeded.
      if (session.payment_status !== 'paid') break;

      const userId = session.metadata?.userId;
      const paymentIntentId =
        typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
      if (!userId || !paymentIntentId) break;

      await grantAccess({
        userId,
        paymentIntentId,
        checkoutSessionId: session.id,
        customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
        amountTotal: session.amount_total ?? 0,
        currency: session.currency ?? 'usd',
      });
      break;
    }

    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const userId = intent.metadata?.userId;
      if (!userId) break;

      await grantAccess({
        userId,
        paymentIntentId: intent.id,
        checkoutSessionId: null,
        customerId: typeof intent.customer === 'string' ? intent.customer : intent.customer?.id ?? null,
        amountTotal: intent.amount_received || intent.amount || 0,
        currency: intent.currency ?? 'usd',
      });
      break;
    }

    case 'payment_intent.payment_failed': {
      // Nothing to revoke — access is only ever granted on success. Logged so a
      // spike in failures is visible in the function logs.
      const intent = event.data.object as Stripe.PaymentIntent;
      console.warn('Payment failed', {
        paymentIntent: intent.id,
        userId: intent.metadata?.userId ?? null,
        reason: intent.last_payment_error?.message ?? null,
      });
      break;
    }

    case 'charge.refunded': {
      // Not subscribed by default, but handled so that adding the event in the
      // Stripe dashboard is all it takes to revoke access on a refund.
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      if (!paymentIntentId) break;
      await supabase
        .from('purchases')
        .update({ status: 'refunded' })
        .eq('stripe_payment_intent_id', paymentIntentId);
      break;
    }
  }

  return res.status(200).json({ received: true });
}

async function grantAccess(purchase: {
  userId: string;
  paymentIntentId: string;
  checkoutSessionId: string | null;
  customerId: string | null;
  amountTotal: number;
  currency: string;
}) {
  await supabase.from('purchases').upsert(
    {
      user_id: purchase.userId,
      stripe_customer_id: purchase.customerId,
      stripe_payment_intent_id: purchase.paymentIntentId,
      stripe_checkout_session_id: purchase.checkoutSessionId,
      amount_total: purchase.amountTotal,
      currency: purchase.currency,
      status: 'paid',
    },
    { onConflict: 'user_id' },
  );
}
