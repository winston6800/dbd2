import type { AgentRole, ConvNode, Fork, Message, NetState, Plot } from './types';
import { uid } from '../monster/ids';

/**
 * Every mutation of the net, as a pure function.
 *
 * The UI holds one `NetState` and swaps it for the result of one of these, so
 * the branching rules can be tested without mounting a canvas — which matters,
 * because "taking a fork wires the new node to the wrong parent" is the kind of
 * bug that silently ruins the graph and is invisible in a screenshot.
 */

const now = () => new Date().toISOString();

export function createPlot(name: string, premise: string): Plot {
  return { id: uid('plot'), name: name.trim(), premise: premise.trim(), createdAt: now() };
}

/**
 * The root conversation. Always the Cartographer: before anything else is
 * worth asking, you need to know which part of the premise is actually unknown.
 */
export function rootNode(plot: Plot): ConvNode {
  return {
    id: uid('node'),
    title: plot.name,
    parentId: null,
    agent: 'cartographer',
    premise: plot.premise,
    messages: [],
    forks: [],
    links: [],
    createdAt: now(),
    resolved: false,
  };
}

export function startPlot(name: string, premise: string): NetState {
  const plot = createPlot(name, premise);
  const root = rootNode(plot);
  return { plot, nodes: [root], activeId: root.id };
}

export function nodeById(state: NetState, id: string | null): ConvNode | null {
  if (!id) return null;
  return state.nodes.find(n => n.id === id) ?? null;
}

function replaceNode(state: NetState, id: string, fn: (n: ConvNode) => ConvNode): NetState {
  return { ...state, nodes: state.nodes.map(n => (n.id === id ? fn(n) : n)) };
}

export function addMessage(state: NetState, nodeId: string, role: Message['role'], text: string): NetState {
  const message: Message = { id: uid('msg'), role, text, at: now() };
  return replaceNode(state, nodeId, n => ({ ...n, messages: [...n.messages, message] }));
}

/**
 * Replaces the node's open forks with the ones the agent just proposed.
 *
 * Replace rather than append: forks are the agent's read of "where to go from
 * here" as of its latest turn, so stale proposals from three turns ago are
 * noise. Forks the user already took live on as real nodes and are unaffected.
 */
export function setForks(
  state: NetState,
  nodeId: string,
  proposed: { title: string; premise: string; agent: AgentRole }[],
): NetState {
  const forks: Fork[] = proposed.map(p => ({
    id: uid('fork'),
    title: p.title,
    premise: p.premise,
    agent: p.agent,
    taken: false,
  }));

  return replaceNode(state, nodeId, n => ({ ...n, forks: [...n.forks.filter(f => f.taken), ...forks] }));
}

/**
 * Takes a fork: marks it spent and grows a child node from it, which becomes
 * the active conversation. This is the only way the net grows.
 */
export function takeFork(state: NetState, nodeId: string, forkId: string): NetState {
  const parent = nodeById(state, nodeId);
  const fork = parent?.forks.find(f => f.id === forkId);
  if (!parent || !fork || fork.taken) return state;

  const child: ConvNode = {
    id: uid('node'),
    title: fork.title,
    parentId: parent.id,
    agent: fork.agent,
    premise: fork.premise,
    messages: [],
    forks: [],
    links: [],
    createdAt: now(),
    resolved: false,
  };

  const withFlag = replaceNode(state, nodeId, n => ({
    ...n,
    forks: n.forks.map(f => (f.id === forkId ? { ...f, taken: true } : f)),
  }));

  return { ...withFlag, nodes: [...withFlag.nodes, child], activeId: child.id };
}

/**
 * Opens a Synthesist node fed by two distant nodes, and records the lateral
 * link between them. Parented to `aId` so the tree stays intact, but the link
 * is what the canvas draws — a visible seam between two branches that had not
 * touched before.
 */
export function collide(state: NetState, aId: string, bId: string): NetState {
  const a = nodeById(state, aId);
  const b = nodeById(state, bId);
  if (!a || !b || a.id === b.id) return state;

  const child: ConvNode = {
    id: uid('node'),
    title: `${a.title} × ${b.title}`,
    parentId: a.id,
    agent: 'synthesist',
    premise: `What falls out of colliding "${a.premise}" with "${b.premise}"?`,
    messages: [],
    forks: [],
    links: [b.id],
    createdAt: now(),
    resolved: false,
  };

  return { ...state, nodes: [...state.nodes, child], activeId: child.id };
}

export function setResolved(state: NetState, nodeId: string, resolved: boolean): NetState {
  return replaceNode(state, nodeId, n => ({ ...n, resolved }));
}

export function setActive(state: NetState, nodeId: string | null): NetState {
  return { ...state, activeId: nodeId };
}

export function renameNode(state: NetState, nodeId: string, title: string): NetState {
  const clean = title.trim();
  if (!clean) return state;
  return replaceNode(state, nodeId, n => ({ ...n, title: clean }));
}

/**
 * Deletes a node and everything under it. The root is refused — dropping it
 * would orphan the whole net, and "start over" is a different action.
 */
export function deleteBranch(state: NetState, nodeId: string): NetState {
  const target = nodeById(state, nodeId);
  if (!target || target.parentId === null) return state;

  const doomed = new Set<string>([nodeId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of state.nodes) {
      if (n.parentId && doomed.has(n.parentId) && !doomed.has(n.id)) {
        doomed.add(n.id);
        grew = true;
      }
    }
  }

  const nodes = state.nodes
    .filter(n => !doomed.has(n.id))
    .map(n => (n.links.some(l => doomed.has(l)) ? { ...n, links: n.links.filter(l => !doomed.has(l)) } : n));

  const activeId = state.activeId && doomed.has(state.activeId) ? (target.parentId ?? null) : state.activeId;

  return { ...state, nodes, activeId };
}
