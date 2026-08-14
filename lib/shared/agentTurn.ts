import { authedPost, ApiError } from './http';

/**
 * Client for /api/agent-turn, the one endpoint that holds the Anthropic key.
 * Both Frontier's per-node conversations and the book summarizer's per-chapter
 * calls are "system prompt + message history in, text out" — this is the
 * shared plumbing.
 */

export { ApiError as AgentError };

export interface TurnMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function postAgentTurn(system: string, messages: TurnMessage[]): Promise<string> {
  const { text } = await authedPost<{ text: string }>('/api/agent-turn', { system, messages });
  return text;
}
