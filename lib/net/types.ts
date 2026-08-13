/**
 * Frontier — the data model for a thinking net.
 *
 * A `Plot` is the thing you are trying to make that does not exist yet.
 * Everything else is the graph of conversations that gets you there: each
 * `ConvNode` is one conversation with one agent, answering one question, and
 * the edges between nodes are how the thinking actually branched.
 *
 * The shape is deliberately a tree plus lateral links, not a flat list. A flat
 * list is what chat apps give you, and it is why nobody can find the good idea
 * they had three weeks ago.
 */

/**
 * The agent driving a conversation. Each one pushes in a different direction —
 * the roster, not the model, is what makes a node go somewhere new.
 */
export type AgentRole = 'cartographer' | 'adversary' | 'synthesist' | 'artificer' | 'historian';

/**
 * `probe` is a real executed result, not something anybody said. It is kept
 * distinct from `user` so the transcript can render it as evidence and the
 * agent can be told plainly that it is measured output rather than an opinion.
 */
export type MessageRole = 'user' | 'agent' | 'probe';

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  /** ISO timestamp. */
  at: string;
}

/**
 * A direction the agent thinks is worth taking, proposed at the end of a turn.
 * Untaken forks are the net's potential energy — they are what makes a node
 * read as "frontier" rather than "done".
 */
export interface Fork {
  id: string;
  title: string;
  /** Why this direction is worth the walk. */
  premise: string;
  /** Which agent should own the conversation this fork opens. */
  agent: AgentRole;
  taken: boolean;
}

export interface ConvNode {
  id: string;
  title: string;
  /** null for the root node of the plot. */
  parentId: string | null;
  agent: AgentRole;
  /** The single question this node exists to answer. */
  premise: string;
  messages: Message[];
  forks: Fork[];
  /**
   * Lateral edges to non-descendant nodes — drawn when a Synthesist collides
   * two distant parts of the net. These are the interesting edges.
   */
  links: string[];
  createdAt: string;
  /** The user has decided this node's question is answered. Cools its heat. */
  resolved: boolean;
}

export interface Plot {
  id: string;
  /** Short handle for the project. */
  name: string;
  /** One sentence: the thing that does not exist yet. */
  premise: string;
  createdAt: string;
}

/** The slice of app state that gets persisted. */
export interface NetState {
  plot: Plot | null;
  nodes: ConvNode[];
  /** Node currently open in the conversation panel. */
  activeId: string | null;
}

export const EMPTY_NET: NetState = { plot: null, nodes: [], activeId: null };

/** Cap on how much history goes to the model, oldest-trimmed. */
export const MAX_CONTEXT_MESSAGES = 24;
