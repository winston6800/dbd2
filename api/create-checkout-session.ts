import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStripe, getStripeConfig } from './_stripe';

/**
 * Starts a subscription with a free trial.
 *
 * A payment method is collected up front so the trial converts to a paid
 * subscription automatically. If the card is missing when the trial ends,
 * Stripe cancels rather than leaving a stuck unpaid subscription.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, email } = req.body as { userId: string; email: string };
  if (!userId || !email) return res.status(400).json({ error: 'Missing userId or email' });

  const config = getStripeConfig();
  const stripe = getStripe(config);
  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    line_items: [{ price: config.priceId, quantity: 1 }],
    success_url: `${appUrl}/?payment=success`,
    cancel_url: `${appUrl}/?payment=cancelled`,
    metadata: { userId },
    payment_method_collection: 'always',
    subscription_data: {
      trial_period_days: config.trialDays,
      // Carried on the subscription so every later lifecycle event can be
      // attributed to a user without a database lookup by customer id.
      metadata: { userId },
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
    },
  });

  return res.status(200).json({ url: session.url });
}
