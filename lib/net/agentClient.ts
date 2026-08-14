import type { AgentRole, ConvNode, Plot } from './types';
import { buildContext, parseReply } from './agents';
import { postAgentTurn } from '../shared/agentTurn';

export { AgentError } from '../shared/agentTurn';

/**
 * Client side of a Frontier node's turn. The session-token attachment and
 * upstream error handling live in postAgentTurn; this layer only owns turning
 * a ConvNode into the request shape and the reply back into prose + forks.
 */

export interface TurnResult {
  prose: string;
  forks: { title: string; premise: string; agent: AgentRole }[];
}

export async function runTurn(
  plot: Plot,
  node: ConvNode,
  ancestors: ConvNode[],
  collided?: ConvNode,
): Promise<TurnResult> {
  const { system, messages } = buildContext(plot, node, ancestors, collided);
  const text = await postAgentTurn(system, messages);
  return parseReply(text);
}
