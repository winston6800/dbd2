import { describe, expect, it } from 'vitest';
import { addMessage, collide, deleteBranch, nodeById, setForks, startPlot, takeFork } from './ops';
import { ancestorsOf, collisionCandidates, descendantsOf, frontierNodes, scoreNet } from './frontier';
import type { NetState } from './types';

/**
 * The net's growth rules. A mis-parented node is invisible in a screenshot and
 * quietly ruins the graph, so the wiring is asserted directly.
 */

function seed(): NetState {
  return startPlot('offline inference', 'A way to run a model too large for the GPU it sits on.');
}

/** Grows a child off `parentId` by proposing one fork and taking it. */
function grow(state: NetState, parentId: string, title: string, agent: 'adversary' | 'historian' | 'artificer' = 'adversary') {
  const withFork = setForks(state, parentId, [{ title, premise: `why: ${title}`, agent }]);
  const fork = nodeById(withFork, parentId)!.forks.find(f => !f.taken)!;
  return takeFork(withFork, parentId, fork.id);
}

describe('startPlot', () => {
  it('opens a single Cartographer root carrying the premise', () => {
    const state = seed();
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0].parentId).toBeNull();
    expect(state.nodes[0].agent).toBe('cartographer');
    expect(state.nodes[0].premise).toContain('too large for the GPU');
    expect(state.activeId).toBe(state.nodes[0].id);
  });
});

describe('takeFork', () => {
  it('wires the new node to the node the fork came from, and focuses it', () => {
    const state = seed();
    const rootId = state.nodes[0].id;
    const next = grow(state, rootId, 'Paging is a lie');

    const child = next.nodes.find(n => n.id !== rootId)!;
    expect(child.parentId).toBe(rootId);
    expect(child.agent).toBe('adversary');
    expect(next.activeId).toBe(child.id);
  });

  it('marks the fork spent so the same branch cannot be grown twice', () => {
    const state = seed();
    const rootId = state.nodes[0].id;
    const next = grow(state, rootId, 'Paging is a lie');

    const fork = nodeById(next, rootId)!.forks[0];
    expect(fork.taken).toBe(true);

    // Re-taking a spent fork must be a no-op, not a duplicate node.
    expect(takeFork(next, rootId, fork.id)).toBe(next);
    expect(next.nodes).toHaveLength(2);
  });

  it('is a no-op for an unknown fork', () => {
    const state = seed();
    expect(takeFork(state, state.nodes[0].id, 'nope')).toBe(state);
  });
});

describe('setForks', () => {
  it('replaces stale proposals but preserves the ones already taken', () => {
    const state = seed();
    const rootId = state.nodes[0].id;
    const grown = grow(state, rootId, 'Taken branch');

    const refreshed = setForks(grown, rootId, [{ title: 'Fresh', premise: 'p', agent: 'historian' }]);
    const forks = nodeById(refreshed, rootId)!.forks;

    expect(forks.filter(f => f.taken).map(f => f.title)).toEqual(['Taken branch']);
    expect(forks.filter(f => !f.taken).map(f => f.title)).toEqual(['Fresh']);
  });
});

describe('collide', () => {
  it('records a lateral link to the distant node and opens a Synthesist', () => {
    let state = seed();
    const rootId = state.nodes[0].id;
    state = grow(state, rootId, 'Branch A');
    const aId = state.activeId!;
    state = grow(state, rootId, 'Branch B', 'historian');
    const bId = state.activeId!;

    const next = collide(state, aId, bId);
    const synth = nodeById(next, next.activeId!)!;

    expect(synth.agent).toBe('synthesist');
    expect(synth.parentId).toBe(aId);
    expect(synth.links).toEqual([bId]);
  });

  it('refuses to collide a node with itself', () => {
    const state = seed();
    const id = state.nodes[0].id;
    expect(collide(state, id, id)).toBe(state);
  });
});

describe('deleteBranch', () => {
  it('removes descendants and clears links that pointed into them', () => {
    let state = seed();
    const rootId = state.nodes[0].id;
    state = grow(state, rootId, 'Branch A');
    const aId = state.activeId!;
    state = grow(state, aId, 'Deep child');
    state = grow(state, rootId, 'Branch B', 'historian');
    const bId = state.activeId!;
    state = collide(state, bId, aId); // B's synthesist links back to A

    const next = deleteBranch(state, aId);

    expect(next.nodes.map(n => n.id)).not.toContain(aId);
    expect(next.nodes.some(n => n.title === 'Deep child')).toBe(false);
    // The surviving synthesist must not keep a dangling link.
    expect(next.nodes.flatMap(n => n.links)).not.toContain(aId);
  });

  it('refuses to delete the root', () => {
    const state = seed();
    expect(deleteBranch(state, state.nodes[0].id)).toBe(state);
  });

  it('moves focus to the parent when the open node is deleted', () => {
    let state = seed();
    const rootId = state.nodes[0].id;
    state = grow(state, rootId, 'Branch A');
    const aId = state.activeId!;

    expect(deleteBranch(state, aId).activeId).toBe(rootId);
  });
});

describe('frontier scoring', () => {
  it('treats an unexplored leaf as frontier and a resolved one as cold', () => {
    let state = seed();
    const rootId = state.nodes[0].id;
    state = grow(state, rootId, 'Leaf');
    const leafId = state.activeId!;

    const scores = scoreNet(state.nodes);
    expect(scores[leafId].isFrontier).toBe(true);
    expect(scores[leafId].depth).toBe(1);

    const resolved = { ...state, nodes: state.nodes.map(n => (n.id === leafId ? { ...n, resolved: true } : n)) };
    const after = scoreNet(resolved.nodes);
    expect(after[leafId].isFrontier).toBe(false);
    expect(after[leafId].heat).toBeLessThan(scores[leafId].heat);
  });

  it('ranks a node with open forks above an equally deep node without', () => {
    let state = seed();
    const rootId = state.nodes[0].id;
    state = grow(state, rootId, 'Quiet');
    const quietId = state.activeId!;
    state = grow(state, rootId, 'Busy', 'historian');
    const busyId = state.activeId!;
    state = setForks(state, busyId, [
      { title: 'a', premise: 'p', agent: 'adversary' },
      { title: 'b', premise: 'p', agent: 'artificer' },
      { title: 'c', premise: 'p', agent: 'historian' },
    ]);

    const scores = scoreNet(state.nodes);
    expect(scores[busyId].heat).toBeGreaterThan(scores[quietId].heat);
    expect(frontierNodes(state.nodes)[0].id).toBe(busyId);
  });

  it('survives a corrupted parent cycle instead of hanging', () => {
    const state = seed();
    const id = state.nodes[0].id;
    const cyclic = [{ ...state.nodes[0], parentId: id }];
    expect(ancestorsOf(cyclic, id)).toEqual([]);
  });
});

describe('collisionCandidates', () => {
  it('excludes the node itself, its ancestors and its descendants', () => {
    let state = seed();
    const rootId = state.nodes[0].id;
    state = grow(state, rootId, 'Branch A');
    const aId = state.activeId!;
    state = grow(state, aId, 'A child');
    const childId = state.activeId!;
    state = grow(state, rootId, 'Branch B', 'historian');
    const bId = state.activeId!;

    // Only nodes with transcript are collidable — give everyone one message.
    for (const id of [rootId, aId, childId, bId]) state = addMessage(state, id, 'agent', 'said something');

    const ids = collisionCandidates(state.nodes, aId).map(n => n.id);

    expect(ids).toContain(bId);
    expect(ids).not.toContain(aId);
    expect(ids).not.toContain(rootId);
    expect(ids).not.toContain(childId);
  });

  it('ignores nodes with no transcript — there is nothing to collide with silence', () => {
    let state = seed();
    const rootId = state.nodes[0].id;
    state = grow(state, rootId, 'Branch A');
    const aId = state.activeId!;
    state = grow(state, rootId, 'Empty B', 'historian');

    expect(collisionCandidates(state.nodes, aId)).toEqual([]);
  });
});

describe('descendantsOf', () => {
  it('walks the whole subtree', () => {
    let state = seed();
    const rootId = state.nodes[0].id;
    state = grow(state, rootId, 'A');
    const aId = state.activeId!;
    state = grow(state, aId, 'B');
    const bId = state.activeId!;

    expect(descendantsOf(state.nodes, rootId).map(n => n.id).sort()).toEqual([aId, bId].sort());
    expect(descendantsOf(state.nodes, bId)).toEqual([]);
  });
});
