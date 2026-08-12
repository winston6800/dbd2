import type { ConvNode } from './types';

/**
 * Frontier scoring.
 *
 * The point of the net is to answer one question at a glance: where is the
 * unexplored edge? Depth alone is wrong (a deep but finished branch is cold),
 * and leaf-ness alone is wrong (an untouched root is not a frontier). Heat
 * combines how far out a node sits, how much unspent potential it carries, and
 * whether anything grows past it.
 *
 * Everything here is a pure function of the node list so the canvas, the rail
 * and the tests all agree on what is hot.
 */

export interface FrontierScore {
  nodeId: string;
  /** Edges from the root. Root is 0. */
  depth: number;
  /** Direct children. */
  children: number;
  /** Proposed-but-untaken forks — the node's potential energy. */
  openForks: number;
  /** 0..1, drives the glow on the canvas. */
  heat: number;
  /** Whether this node is on the live edge of the net. */
  isFrontier: boolean;
}

export function childrenOf(nodes: ConvNode[], id: string): ConvNode[] {
  return nodes.filter(n => n.parentId === id);
}

/**
 * Root-first chain of ancestors, excluding the node itself. Guards against a
 * corrupted parent chain looping forever rather than trusting the data.
 */
export function ancestorsOf(nodes: ConvNode[], id: string): ConvNode[] {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const chain: ConvNode[] = [];
  const seen = new Set<string>([id]);

  let cursor = byId.get(id)?.parentId ?? null;
  while (cursor && !seen.has(cursor)) {
    const parent = byId.get(cursor);
    if (!parent) break;
    chain.push(parent);
    seen.add(cursor);
    cursor = parent.parentId;
  }

  return chain.reverse();
}

export function depthOf(nodes: ConvNode[], id: string): number {
  return ancestorsOf(nodes, id).length;
}

/** Every node reachable downward from `id`, excluding itself. */
export function descendantsOf(nodes: ConvNode[], id: string): ConvNode[] {
  const out: ConvNode[] = [];
  const queue = [id];
  const seen = new Set<string>([id]);

  while (queue.length) {
    for (const child of childrenOf(nodes, queue.shift()!)) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      out.push(child);
      queue.push(child.id);
    }
  }

  return out;
}

export function scoreNet(nodes: ConvNode[]): Record<string, FrontierScore> {
  const depths = new Map(nodes.map(n => [n.id, depthOf(nodes, n.id)]));
  const maxDepth = Math.max(0, ...depths.values());

  const scores: Record<string, FrontierScore> = {};

  for (const node of nodes) {
    const depth = depths.get(node.id) ?? 0;
    const children = childrenOf(nodes, node.id).length;
    const openForks = node.forks.filter(f => !f.taken).length;

    const depthNorm = maxDepth > 0 ? depth / maxDepth : 0;
    const forkNorm = Math.min(1, openForks / 3);
    const leafness = children === 0 ? 1 : 0;

    // A resolved node keeps a little warmth so a finished deep branch still
    // reads as territory covered, rather than vanishing into the background.
    const raw = 0.4 * depthNorm + 0.35 * forkNorm + 0.25 * leafness;
    const heat = clamp01(node.resolved ? raw * 0.3 : raw);

    scores[node.id] = {
      nodeId: node.id,
      depth,
      children,
      openForks,
      heat,
      isFrontier: !node.resolved && (children === 0 || openForks > 0),
    };
  }

  return scores;
}

/** Hottest first — what the rail points at when you ask "where do I go next". */
export function frontierNodes(nodes: ConvNode[]): ConvNode[] {
  const scores = scoreNet(nodes);
  return nodes
    .filter(n => scores[n.id]?.isFrontier)
    .sort((a, b) => (scores[b.id]?.heat ?? 0) - (scores[a.id]?.heat ?? 0));
}

/**
 * Candidates for a Synthesist collision: nodes that are neither ancestors nor
 * descendants of the given node, because colliding a node with its own lineage
 * just re-derives the path that produced it. Furthest-apart first, and nodes
 * with actual transcript preferred — there is nothing to collide with silence.
 */
export function collisionCandidates(nodes: ConvNode[], id: string): ConvNode[] {
  const excluded = new Set<string>([id, ...ancestorsOf(nodes, id).map(n => n.id), ...descendantsOf(nodes, id).map(n => n.id)]);
  const myDepth = depthOf(nodes, id);

  return nodes
    .filter(n => !excluded.has(n.id) && n.messages.length > 0)
    .sort((a, b) => separation(nodes, b, id, myDepth) - separation(nodes, a, id, myDepth));
}

/**
 * Cheap proxy for graph distance: how far two nodes' lineages diverge. Exact
 * shortest-path would be more correct, but the net is a tree with a handful of
 * lateral links and this ranks the same way for a fraction of the work.
 */
function separation(nodes: ConvNode[], node: ConvNode, fromId: string, fromDepth: number): number {
  const mine = new Set(ancestorsOf(nodes, fromId).map(n => n.id));
  const theirs = ancestorsOf(nodes, node.id);
  const sharedDepth = theirs.filter(a => mine.has(a.id)).length;
  return fromDepth + theirs.length - 2 * sharedDepth;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
