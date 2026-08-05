import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from './_stripe.js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Opens the Stripe billing portal, which is where a subscriber cancels,
 * resumes, or updates their card. Cancelling there sets
 * `cancel_at_period_end`, and the resulting webhook keeps access alive until
 * the period actually ends.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.body as { userId: string };
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!sub?.stripe_customer_id) return res.status(404).json({ error: 'No subscription found' });

  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;

  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: appUrl,
  });

  return res.status(200).json({ url: session.url });
}
