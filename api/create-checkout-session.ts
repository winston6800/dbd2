import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStripe, getStripeConfig } from './_stripe.js';
import { getAuthenticatedUser } from './_auth.js';

/**
 * Starts a subscription with a free trial.
 *
 * A payment method is collected up front so the trial converts to a paid
 * subscription automatically. If the card is missing when the trial ends,
 * Stripe cancels rather than leaving a stuck unpaid subscription.
 *
 * The identity that ends up in the subscription's metadata comes from the
 * caller's verified session, never from the request body — a spoofed userId
 * here would let one account's checkout overwrite another user's row when the
 * webhook lands (subscriptions upsert on user_id).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in' });

  const config = getStripeConfig();
  const stripe = getStripe(config);
  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    line_items: [{ price: config.priceId, quantity: 1 }],
    success_url: `${appUrl}/?payment=success`,
    cancel_url: `${appUrl}/?payment=cancelled`,
    metadata: { userId: user.id },
    payment_method_collection: 'always',
    subscription_data: {
      trial_period_days: config.trialDays,
      // Carried on the subscription so every later lifecycle event can be
      // attributed to a user without a database lookup by customer id.
      metadata: { userId: user.id },
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
    },
  });

  return res.status(200).json({ url: session.url });
}
