import { supabase } from '../supabase';
import type { AgentRole, ConvNode, Plot } from './types';
import { buildContext, parseReply } from './agents';

/**
 * Client side of an agent turn.
 *
 * The session token is attached on every call because /api/agent-turn is the
 * only route to the model and refuses anonymous callers — the alternative,
 * putting the key in the bundle, would make the whole paywall decorative.
 */

export interface TurnResult {
  prose: string;
  forks: { title: string; premise: string; agent: AgentRole }[];
}

export class AgentError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AgentError';
  }
}

export async function runTurn(
  plot: Plot,
  node: ConvNode,
  ancestors: ConvNode[],
  collided?: ConvNode,
): Promise<TurnResult> {
  const { system, messages } = buildContext(plot, node, ancestors, collided);

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AgentError('Your session expired — sign in again', 401);

  const res = await fetch('/api/agent-turn', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ system, messages }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new AgentError(body.error ?? 'The agent could not answer', res.status);
  }

  const { text } = (await res.json()) as { text: string };
  return parseReply(text);
}
