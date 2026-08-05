import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Creates a one-time Checkout session. `STRIPE_PRICE_ID` must point at a
 * one-off price — Stripe rejects a recurring price in `payment` mode.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, email } = req.body as { userId: string; email: string };
  if (!userId || !email) return res.status(400).json({ error: 'Missing userId or email' });

  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${appUrl}/?payment=success`,
    cancel_url: `${appUrl}/?payment=cancelled`,
    metadata: { userId },
    // Copied onto the PaymentIntent so payment_intent.succeeded can identify
    // the buyer on its own — it does not inherit the session's metadata.
    payment_intent_data: { metadata: { userId } },
  });

  return res.status(200).json({ url: session.url });
}
