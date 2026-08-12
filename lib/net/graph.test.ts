import { describe, expect, it } from 'vitest';
import { edgesOf, layoutNet, viewBoxFor } from './graph';
import { setForks, startPlot, takeFork, collide, nodeById } from './ops';
import type { ConvNode, NetState } from './types';

/**
 * The layout's contract is that it is *deterministic*. A force layout seeded
 * with Math.random re-arranges itself on every mount, which destroys the one
 * thing a spatial view is for — the user remembering where things are.
 */

function grow(state: NetState, parentId: string, title: string): NetState {
  const withFork = setForks(state, parentId, [{ title, premise: `why ${title}`, agent: 'adversary' }]);
  const fork = nodeById(withFork, parentId)!.forks.find(f => !f.taken)!;
  return takeFork(withFork, parentId, fork.id);
}

function tree(): NetState {
  let state = startPlot('net', 'A premise long enough to be real.');
  const rootId = state.nodes[0].id;
  state = grow(state, rootId, 'A');
  const aId = state.activeId!;
  state = grow(state, aId, 'A deep');
  state = grow(state, rootId, 'B');
  return state;
}

describe('edgesOf', () => {
  it('emits one parent edge per child', () => {
    const state = tree();
    const parents = edgesOf(state.nodes).filter(e => e.kind === 'parent');
    expect(parents).toHaveLength(state.nodes.length - 1);
  });

  it('emits one edge per lateral link, not two', () => {
    let state = tree();
    const [rootId, aId] = [state.nodes[0].id, state.nodes[1].id];
    state = collide(state, rootId, aId);

    // Mirror the link onto the other node — a hand-edited net could do this.
    const mirrored = state.nodes.map(n =>
      n.id === aId ? { ...n, links: [...n.links, state.activeId!] } : n,
    );

    const links = edgesOf(mirrored).filter(e => e.kind === 'link');
    expect(links).toHaveLength(1);
  });

  it('drops links pointing at nodes that no longer exist', () => {
    const state = tree();
    const withDangling: ConvNode[] = state.nodes.map((n, i) => (i === 0 ? { ...n, links: ['ghost'] } : n));
    expect(edgesOf(withDangling).filter(e => e.kind === 'link')).toEqual([]);
  });
});

describe('layoutNet', () => {
  it('is deterministic for the same net', () => {
    const state = tree();
    expect(layoutNet(state.nodes).nodes).toEqual(layoutNet(state.nodes).nodes);
  });

  it('places every node and produces finite coordinates', () => {
    const layout = layoutNet(tree().nodes);
    const positions = Object.values(layout.nodes);

    expect(positions).toHaveLength(4);
    for (const p of positions) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(p.r).toBeGreaterThan(0);
    }
  });

  it('separates nodes rather than stacking them on one point', () => {
    const positions = Object.values(layoutNet(tree().nodes).nodes);

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        expect(Math.hypot(dx, dy)).toBeGreaterThan(20);
      }
    }
  });

  it('handles a single-node net without dividing by zero', () => {
    const state = startPlot('solo', 'Only the root exists here.');
    const layout = layoutNet(state.nodes);

    const only = layout.nodes[state.nodes[0].id];
    expect(only.x).toBeCloseTo(0);
    expect(only.y).toBeCloseTo(0);
  });

  it('returns an empty layout for an empty net', () => {
    expect(layoutNet([]).nodes).toEqual({});
  });

  it('keeps coincident seeds apart deterministically', () => {
    // Two nodes that would seed to the same ring position if the hash jitter
    // were removed; the repulsion term must not produce NaN.
    const base = startPlot('n', 'A premise long enough to be real.');
    const root = base.nodes[0];
    const twin: ConvNode = { ...root, id: `${root.id}-twin`, parentId: null };

    const layout = layoutNet([root, twin]);
    expect(Number.isFinite(layout.nodes[twin.id].x)).toBe(true);
    expect(layout.nodes[twin.id]).not.toEqual(layout.nodes[root.id]);
  });
});

describe('viewBoxFor', () => {
  it('frames the whole net with padding', () => {
    const layout = layoutNet(tree().nodes);
    const [x, y, w, h] = viewBoxFor(layout).split(' ').map(Number);

    expect(w).toBeGreaterThan(layout.bounds.maxX - layout.bounds.minX);
    expect(h).toBeGreaterThan(layout.bounds.maxY - layout.bounds.minY);
    expect(x).toBeLessThanOrEqual(layout.bounds.minX);
    expect(y).toBeLessThanOrEqual(layout.bounds.minY);
  });

  it('falls back to a sane box for an empty net', () => {
    expect(viewBoxFor(layoutNet([])).split(' ')).toHaveLength(4);
  });
});
