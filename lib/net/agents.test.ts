import { describe, expect, it } from 'vitest';
import { buildContext, parseReply } from './agents';
import { rootNode, createPlot } from './ops';
import type { ConvNode } from './types';

/**
 * The FORKS block is a convention the model follows, not a guarantee. Losing a
 * user's answer because the header came back bolded would be far worse than
 * losing the forks, so the parser is asserted against the ways it actually
 * comes back malformed.
 */

describe('parseReply', () => {
  const body = 'The hard part is not paging, it is the scheduler.';

  it('splits prose from a well-formed forks block', () => {
    const { prose, forks } = parseReply(
      `${body}\n\nFORKS\n- adversary: Scheduler first :: The bottleneck may be ordering, not memory.\n- historian: Prior art :: Someone shipped this in 2016.`,
    );

    expect(prose).toBe(body);
    expect(forks).toEqual([
      { agent: 'adversary', title: 'Scheduler first', premise: 'The bottleneck may be ordering, not memory.' },
      { agent: 'historian', title: 'Prior art', premise: 'Someone shipped this in 2016.' },
    ]);
  });

  it('tolerates a bolded or decorated header', () => {
    const { prose, forks } = parseReply(`${body}\n\n**FORKS**\n- artificer: Probe it :: Build the smallest test.`);
    expect(prose).toBe(body);
    expect(forks).toHaveLength(1);
    expect(forks[0].agent).toBe('artificer');
  });

  it('keeps the prose when no forks block comes back at all', () => {
    expect(parseReply(body)).toEqual({ prose: body, forks: [] });
  });

  it('drops lines naming an agent that does not exist', () => {
    const { forks } = parseReply(`${body}\n\nFORKS\n- philosopher: Nope :: not on the roster\n- adversary: Yes :: on the roster`);
    expect(forks.map(f => f.agent)).toEqual(['adversary']);
  });

  it('caps at four forks so one reply cannot fan out the whole canvas', () => {
    const lines = Array.from({ length: 7 }, (_, i) => `- adversary: F${i} :: why ${i}`).join('\n');
    expect(parseReply(`${body}\n\nFORKS\n${lines}`).forks).toHaveLength(4);
  });

  it('ignores malformed lines missing the :: separator', () => {
    const { forks } = parseReply(`${body}\n\nFORKS\n- adversary: no separator here\n- historian: Good :: has one`);
    expect(forks.map(f => f.title)).toEqual(['Good']);
  });
});

describe('buildContext', () => {
  const plot = createPlot('offline inference', 'Run a model too large for its GPU.');

  function node(overrides: Partial<ConvNode> = {}): ConvNode {
    return { ...rootNode(plot), ...overrides };
  }

  it('carries the plot and the node question into the system prompt', () => {
    const { system } = buildContext(plot, node(), []);
    expect(system).toContain('offline inference');
    expect(system).toContain('Run a model too large for its GPU.');
    expect(system).toContain('FORKS');
  });

  it('lists the ancestor chain so a deep node still knows its project', () => {
    const parent = node({ title: 'Paging', premise: 'Is paging the bottleneck?', agent: 'adversary' });
    const { system } = buildContext(plot, node(), [parent]);

    expect(system).toContain('Paging');
    expect(system).toContain('Is paging the bottleneck?');
    expect(system).toContain('Adversary');
  });

  it('marks the root as the root rather than claiming an empty lineage', () => {
    expect(buildContext(plot, node(), []).system).toContain('root of the net');
  });

  it('includes the collided node only when one is given', () => {
    const distant = node({
      title: 'Weather hedging',
      premise: 'How do small farms hedge?',
      messages: [{ id: 'm1', role: 'agent', text: 'Insurers price tail risk badly.', at: '2026-01-01T00:00:00Z' }],
    });

    expect(buildContext(plot, node(), []).system).not.toContain('COLLIDING');

    const { system } = buildContext(plot, node({ agent: 'synthesist' }), [], distant);
    expect(system).toContain('COLLIDING');
    expect(system).toContain('Insurers price tail risk badly.');
  });

  it('trims history to the context cap, keeping the most recent turns', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      id: `m${i}`,
      role: (i % 2 === 0 ? 'user' : 'agent') as 'user' | 'agent',
      text: `turn ${i}`,
      at: '2026-01-01T00:00:00Z',
    }));

    const { messages } = buildContext(plot, node({ messages: many }), []);

    expect(messages).toHaveLength(24);
    expect(messages[messages.length - 1].content).toBe('turn 39');
    // Roles must map to the API's vocabulary, not ours.
    expect(new Set(messages.map(m => m.role))).toEqual(new Set(['user', 'assistant']));
  });
});
