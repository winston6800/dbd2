import Stripe from 'stripe';

/**
 * Stripe configuration, resolved per mode.
 *
 * `STRIPE_MODE` picks which set of credentials the serverless functions use:
 *
 *   STRIPE_MODE=test   →  *_TEST vars   (test keys, test price, test webhook secret)
 *   STRIPE_MODE=live   →  *_LIVE vars
 *
 * Files under /api whose name starts with `_` are not routed as endpoints, so
 * this is a shared module rather than a function.
 *
 * Both modes can be configured at once, which is the point: a preview
 * deployment runs `STRIPE_MODE=test` against test keys while production runs
 * `live`, and neither needs a code change to switch. The unsuffixed legacy
 * names are still honoured as a fallback so an existing deployment keeps
 * working until its env vars are split.
 */

export type StripeMode = 'test' | 'live';

export function resolveMode(): StripeMode {
  return (process.env.STRIPE_MODE ?? 'test').toLowerCase() === 'live' ? 'live' : 'test';
}

function pick(name: string, mode: StripeMode): string | undefined {
  const suffixed = process.env[`${name}_${mode.toUpperCase()}`];
  return suffixed || process.env[name];
}

export interface StripeConfig {
  mode: StripeMode;
  secretKey: string;
  webhookSecret: string;
  priceId: string;
  trialDays: number;
}

export function getStripeConfig(): StripeConfig {
  const mode = resolveMode();
  const secretKey = pick('STRIPE_SECRET_KEY', mode);
  const webhookSecret = pick('STRIPE_WEBHOOK_SECRET', mode);
  const priceId = pick('STRIPE_PRICE_ID', mode);

  const missing = [
    !secretKey && `STRIPE_SECRET_KEY_${mode.toUpperCase()}`,
    !webhookSecret && `STRIPE_WEBHOOK_SECRET_${mode.toUpperCase()}`,
    !priceId && `STRIPE_PRICE_ID_${mode.toUpperCase()}`,
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(`Stripe is in ${mode} mode but these are unset: ${missing.join(', ')}`);
  }

  // A live key in test mode (or the reverse) fails confusingly at the API
  // rather than here, so catch the mismatch up front.
  const looksLive = secretKey!.startsWith('sk_live_') || secretKey!.startsWith('rk_live_');
  if (mode === 'test' && looksLive) {
    throw new Error('STRIPE_MODE=test but a live secret key was supplied');
  }
  if (mode === 'live' && !looksLive) {
    throw new Error('STRIPE_MODE=live but the secret key is not a live key');
  }

  return {
    mode,
    secretKey: secretKey!,
    webhookSecret: webhookSecret!,
    priceId: priceId!,
    trialDays: Number(process.env.STRIPE_TRIAL_DAYS ?? 3),
  };
}

export function getStripe(config: StripeConfig = getStripeConfig()): Stripe {
  return new Stripe(config.secretKey);
}

/** Subscription statuses that grant access to the app. */
export const ENTITLED_STATUSES = ['trialing', 'active'] as const;
