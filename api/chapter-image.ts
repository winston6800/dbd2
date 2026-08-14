import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthenticatedUser } from './_auth.js';
import { isEntitled } from './_entitlement.js';

/**
 * Generates one chapter's illustration.
 *
 * Separate endpoint from agent-turn because it is a separate upstream (OpenAI
 * images, not Anthropic) with a separate key — but the trust requirement is
 * identical, so it shares the same auth + entitlement gate rather than
 * inventing a second one.
 *
 * Images come back as base64 and are handed to the client as a data: URI. No
 * bucket/CDN is wired up yet, so the image is stored inline in the book's row
 * — see lib/books/storage.ts for the size tradeoff that implies.
 */

const MODEL = 'gpt-image-1';
const SIZE = '1024x1024';
const PROMPT_LIMIT = 800;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Image generation is not configured' });

  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in' });

  if (!(await isEntitled(user.id, user.email))) {
    return res.status(402).json({ error: 'No active subscription' });
  }

  const { prompt } = (req.body ?? {}) as { prompt?: unknown };
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Missing prompt' });
  }
  if (prompt.length > PROMPT_LIMIT) {
    return res.status(413).json({ error: 'Prompt too long' });
  }

  let upstream: Response;
  try {
    upstream = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, prompt, size: SIZE, n: 1 }),
    });
  } catch (err) {
    console.error('Chapter image: upstream unreachable', err);
    return res.status(502).json({ error: 'Could not reach the image model' });
  }

  if (!upstream.ok) {
    // Never forward the upstream body — it can echo the prompt and, on an
    // auth failure, details about our account.
    console.error('Chapter image: upstream error', { status: upstream.status });
    const status = upstream.status === 429 ? 429 : 502;
    return res.status(status).json({
      error: status === 429 ? 'The image model is busy — try again in a moment' : 'The image model refused that prompt',
    });
  }

  const payload = (await upstream.json()) as { data?: { b64_json?: string }[] };
  const b64 = payload.data?.[0]?.b64_json;
  if (!b64) return res.status(502).json({ error: 'The image model returned nothing' });

  return res.status(200).json({ dataUrl: `data:image/png;base64,${b64}` });
}
