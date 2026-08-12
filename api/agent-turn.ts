import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from './_auth.js';

/**
 * Runs one agent turn.
 *
 * The Anthropic key lives here and never reaches the browser, so this endpoint
 * is the only path to the model. That makes it the place where entitlement is
 * actually enforced: the client-side gate is a UX affordance, but this check is
 * what stops someone with the public anon key from running a free inference
 * farm on our card.
 *
 * The system prompt is composed on the client (it is the product's authored
 * content, not a secret) and passed in, but the model, token ceiling and
 * per-request size limits are fixed server-side.
 */

const MODEL = 'claude-opus-5';
const MAX_TOKENS = 1600;

/** Statuses that grant access. Mirrors ENTITLED in lib/supabase.ts. */
const ENTITLED = ['trialing', 'active'];

/** Ceilings that bound the cost of any single request. */
const LIMITS = { system: 24_000, messages: 40, content: 12_000 };

interface TurnMessage {
  role: 'user' | 'assistant';
  content: string;
}

function isTurnMessage(value: unknown): value is TurnMessage {
  const m = value as TurnMessage;
  return !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string';
}

/**
 * Admins skip the paywall, matching the client gate. Everyone else needs a
 * subscription in an entitled status.
 */
async function isEntitled(userId: string, email: string): Promise<boolean> {
  const admins = (process.env.VITE_ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  if (admins.includes(email.toLowerCase())) return true;

  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await db
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .in('status', ENTITLED)
    .maybeSingle();

  return !!data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Agent is not configured' });

  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in' });

  if (!(await isEntitled(user.id, user.email))) {
    return res.status(402).json({ error: 'No active subscription' });
  }

  const { system, messages } = (req.body ?? {}) as { system?: unknown; messages?: unknown };

  if (typeof system !== 'string' || !system.trim()) {
    return res.status(400).json({ error: 'Missing system prompt' });
  }
  if (!Array.isArray(messages) || messages.length === 0 || !messages.every(isTurnMessage)) {
    return res.status(400).json({ error: 'Missing or malformed messages' });
  }
  if (
    system.length > LIMITS.system ||
    messages.length > LIMITS.messages ||
    messages.some(m => m.content.length > LIMITS.content)
  ) {
    return res.status(413).json({ error: 'Conversation too large for one turn' });
  }

  // The Anthropic REST API is called directly rather than through the SDK:
  // one POST, no streaming, and one less dependency in the function bundle.
  let upstream: Response;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system, messages }),
    });
  } catch (err) {
    console.error('Agent turn: upstream unreachable', err);
    return res.status(502).json({ error: 'Could not reach the model' });
  }

  if (!upstream.ok) {
    // Never forward the upstream body — it can echo request content and, on an
    // auth failure, details about our account.
    console.error('Agent turn: upstream error', { status: upstream.status });
    const status = upstream.status === 429 ? 429 : 502;
    return res.status(status).json({
      error: status === 429 ? 'The agents are busy — try again in a moment' : 'The model refused that turn',
    });
  }

  const payload = (await upstream.json()) as { content?: { type: string; text?: string }[] };
  const text = (payload.content ?? [])
    .filter(block => block.type === 'text')
    .map(block => block.text ?? '')
    .join('')
    .trim();

  if (!text) return res.status(502).json({ error: 'The model returned nothing' });

  return res.status(200).json({ text });
}
