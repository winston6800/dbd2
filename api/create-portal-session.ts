import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from './_stripe.js';
import { getAuthenticatedUser } from './_auth.js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Opens the Stripe billing portal, which is where a subscriber cancels,
 * resumes, or updates their card. Cancelling there sets
 * `cancel_at_period_end`, and the resulting webhook keeps access alive until
 * the period actually ends.
 *
 * The target user comes from the caller's verified session, never the request
 * body — an unverified userId here would hand out a live billing-portal link
 * (someone's card, invoices, and cancel button) to whoever asked for it.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in' });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) return res.status(404).json({ error: 'No subscription found' });

  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;

  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: appUrl,
  });

  return res.status(200).json({ url: session.url });
}
