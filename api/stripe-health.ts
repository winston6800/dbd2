import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStripe, getStripeConfig } from './_stripe';

/**
 * Checks the Stripe configuration without moving money.
 *
 * Catches the mistakes that only ever show up in live mode — price created in
 * test only, a one-off price where a recurring one is required, keys that do
 * not match STRIPE_MODE, a missing webhook secret — before a real customer
 * finds them.
 *
 * Disabled unless HEALTH_CHECK_TOKEN is set; call it as
 * `/api/stripe-health?token=...`. It reports configuration facts only, never
 * key material.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expected = process.env.HEALTH_CHECK_TOKEN;
  if (!expected) return res.status(404).json({ error: 'Not found' });
  if (req.query.token !== expected) return res.status(401).json({ error: 'Unauthorized' });

  const checks: { name: string; ok: boolean; detail: string }[] = [];

  let config;
  try {
    config = getStripeConfig();
    checks.push({
      name: 'env',
      ok: true,
      detail: `mode=${config.mode}, trial=${config.trialDays}d, webhook secret present`,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      checks: [{ name: 'env', ok: false, detail: err instanceof Error ? err.message : 'unknown' }],
    });
  }

  const stripe = getStripe(config);

  // The key works, and belongs to the account you think it does.
  try {
    // Retrieving the balance is the cheapest proof the key is valid, and unlike
    // accounts.retrieve() it needs no account id.
    await stripe.balance.retrieve();
    const account = await stripe.accounts.list({ limit: 1 }).then(r => r.data[0]);
    checks.push({
      name: 'api_key',
      ok: true,
      detail: account ? `key valid, account ${account.id}` : 'key valid',
    });
    if (account && account.charges_enabled === false) {
      checks.push({
        name: 'charges_enabled',
        ok: false,
        detail: 'Stripe has not activated this account for charges yet',
      });
    }
  } catch (err) {
    checks.push({ name: 'api_key', ok: false, detail: err instanceof Error ? err.message : 'unknown' });
  }

  // The price exists in *this* mode and is recurring — the failure that breaks
  // checkout outright.
  try {
    const price = await stripe.prices.retrieve(config.priceId);
    const recurring = price.type === 'recurring';
    checks.push({
      name: 'price',
      ok: recurring && price.active,
      detail: recurring
        ? `${(price.unit_amount ?? 0) / 100} ${price.currency?.toUpperCase()} / ${price.recurring?.interval}${
            price.active ? '' : ' — INACTIVE'
          }`
        : `price is ${price.type}, but subscription mode needs a recurring price`,
    });
  } catch (err) {
    checks.push({
      name: 'price',
      ok: false,
      detail: `${config.priceId} not found in ${config.mode} mode — ${
        err instanceof Error ? err.message : 'unknown'
      }`,
    });
  }

  // A webhook endpoint exists for this mode. Cannot confirm the signing secret
  // matches — only a delivered event proves that.
  try {
    const endpoints = await stripe.webhookEndpoints.list({ limit: 10 });
    const required = [
      'checkout.session.completed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ];
    const matching = endpoints.data.filter(e => e.url.includes('/api/stripe-webhook'));
    const missing = required.filter(
      evt => !matching.some(e => e.enabled_events.includes(evt) || e.enabled_events.includes('*')),
    );
    checks.push({
      name: 'webhook',
      ok: matching.length > 0 && missing.length === 0,
      detail:
        matching.length === 0
          ? `no endpoint pointing at /api/stripe-webhook in ${config.mode} mode`
          : missing.length
            ? `endpoint found but not subscribed to: ${missing.join(', ')}`
            : `${matching.length} endpoint(s), required events subscribed`,
    });
  } catch (err) {
    checks.push({ name: 'webhook', ok: false, detail: err instanceof Error ? err.message : 'unknown' });
  }

  const ok = checks.every(c => c.ok);
  return res.status(ok ? 200 : 500).json({ ok, mode: config.mode, checks });
}
