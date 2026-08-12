import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NetCanvas } from './NetCanvas';
import { collide, nodeById, setForks, startPlot, takeFork } from '../../lib/net/ops';
import type { ConvNode, NetState } from '../../lib/net/types';

/**
 * The canvas is the product's centrepiece, and an SVG that renders zero circles
 * looks identical to a hung app. These assert that the net actually reaches the
 * DOM: one shape per node, one line per edge, and clicks routed to the right id.
 */

function grow(state: NetState, parentId: string, title: string): NetState {
  const withFork = setForks(state, parentId, [{ title, premise: `why ${title}`, agent: 'adversary' }]);
  const fork = nodeById(withFork, parentId)!.forks.find(f => !f.taken)!;
  return takeFork(withFork, parentId, fork.id);
}

function tree(): NetState {
  let state = startPlot('offline inference', 'Run a model too large for the GPU it sits on.');
  const rootId = state.nodes[0].id;
  state = grow(state, rootId, 'Branch A');
  state = grow(state, rootId, 'Branch B');
  return state;
}

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('canvas rendered no svg');
  return svg as SVGSVGElement;
}

describe('NetCanvas', () => {
  it('draws a node for every conversation and labels it', () => {
    const state = tree();
    const { container } = render(<NetCanvas nodes={state.nodes} activeId={state.activeId} onSelect={() => {}} />);

    // One body circle + one agent dot per node.
    expect(svgOf(container).querySelectorAll('circle').length).toBeGreaterThanOrEqual(state.nodes.length * 2);
    expect(screen.getByText('Branch A')).toBeTruthy();
    expect(screen.getByText('Branch B')).toBeTruthy();
  });

  it('draws one line per parent edge', () => {
    const state = tree();
    const { container } = render(<NetCanvas nodes={state.nodes} activeId={null} onSelect={() => {}} />);

    // Two children → two parent edges. Fork ticks are lines too, so filter to
    // the edge group, which is the first <g>.
    const edgeGroup = svgOf(container).querySelector('g')!;
    expect(edgeGroup.querySelectorAll('line')).toHaveLength(2);
  });

  it('draws a lateral link dashed, so a collision is visibly different', () => {
    let state = tree();
    const [aId, bId] = [state.nodes[1].id, state.nodes[2].id];
    state = collide(state, aId, bId);

    const { container } = render(<NetCanvas nodes={state.nodes} activeId={null} onSelect={() => {}} />);
    const dashed = [...svgOf(container).querySelectorAll('line')].filter(l => l.getAttribute('stroke-dasharray'));

    expect(dashed.length).toBeGreaterThanOrEqual(1);
  });

  it('reports the clicked node id', () => {
    const state = tree();
    const onSelect = vi.fn();
    render(<NetCanvas nodes={state.nodes} activeId={null} onSelect={onSelect} />);

    fireEvent.click(screen.getByLabelText(/Branch A/));
    expect(onSelect).toHaveBeenCalledWith(state.nodes[1].id);
  });

  it('renders fork ticks for untaken forks', () => {
    let state = tree();
    const leafId = state.activeId!;
    state = setForks(state, leafId, [
      { title: 'a', premise: 'p', agent: 'adversary' },
      { title: 'b', premise: 'p', agent: 'historian' },
    ]);

    const { container } = render(<NetCanvas nodes={state.nodes} activeId={leafId} onSelect={() => {}} />);
    const groups = [...svgOf(container).querySelectorAll('g[role="button"]')];
    const leafGroup = groups.find(g => g.getAttribute('aria-label')?.includes('Branch B'))!;

    expect(leafGroup.querySelectorAll('line')).toHaveLength(2);
  });

  it('renders nothing rather than an empty frame for an empty net', () => {
    const { container } = render(<NetCanvas nodes={[]} activeId={null} onSelect={() => {}} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('truncates a long title instead of overflowing the canvas', () => {
    const state = startPlot('x', 'A premise long enough to be real.');
    const long: ConvNode = { ...state.nodes[0], title: 'A'.repeat(60) };

    render(<NetCanvas nodes={[long]} activeId={null} onSelect={() => {}} />);
    expect(screen.getByText(/…$/).textContent!.length).toBeLessThanOrEqual(22);
  });
});
