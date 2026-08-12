import React, { useEffect, useMemo } from 'react';
import { C, DISPLAY_FONT, MONO_FONT, VOID_BACKGROUND } from '../lib/net/tokens';
import { track, trackOnce } from '../lib/monster/analytics';
import { AGENT_LIST } from '../lib/net/agents';
import type { AgentRole, ConvNode } from '../lib/net/types';
import { NetCanvas } from './Frontier/NetCanvas';

/**
 * The marketing surface for logged-out visitors.
 *
 * The demo in the middle is not a mockup — it is the real NetCanvas rendering a
 * hand-written net through the real layout engine. If the graph ever stops
 * looking good, the landing page breaks too, which is the correct incentive.
 */

const BEATS: { title: string; body: string }[] = [
  {
    title: 'Declare what does not exist',
    body: 'One sentence describing the thing you are trying to make. Not a goal — a thing. Every agent in the net is pointed at the part nobody has done.',
  },
  {
    title: 'Take the forks, not the thread',
    body: 'Each agent ends by proposing directions that genuinely diverge. Take one and it becomes a new conversation, wired to where it came from.',
  },
  {
    title: 'Collide the distant branches',
    body: 'The Synthesist takes two nodes from opposite sides of your net and forces a connection. That collision is where new things actually come from.',
  },
];

/** A hand-written net, rendered through the real engine. */
function demoNode(
  id: string,
  title: string,
  agent: AgentRole,
  parentId: string | null,
  messages: number,
  forks = 0,
  links: string[] = [],
): ConvNode {
  return {
    id,
    title,
    parentId,
    agent,
    premise: title,
    messages: Array.from({ length: messages }, (_, i) => ({
      id: `${id}-m${i}`,
      role: i % 2 === 0 ? ('user' as const) : ('agent' as const),
      text: '',
      at: '2026-01-01T00:00:00Z',
    })),
    forks: Array.from({ length: forks }, (_, i) => ({
      id: `${id}-f${i}`,
      title: '',
      premise: '',
      agent: 'adversary' as AgentRole,
      taken: false,
    })),
    links,
    createdAt: '2026-01-01T00:00:00Z',
    resolved: false,
  };
}

const DEMO_NET: ConvNode[] = [
  demoNode('n0', 'offline inference', 'cartographer', null, 6),
  demoNode('n1', 'Is paging the bottleneck?', 'adversary', 'n0', 5),
  demoNode('n2', 'Who tried this in 2016', 'historian', 'n0', 4),
  demoNode('n3', 'Scheduler, not memory', 'adversary', 'n1', 3, 2),
  demoNode('n4', 'Smallest probe', 'artificer', 'n1', 2, 1),
  demoNode('n5', 'Paging × prior art', 'synthesist', 'n3', 3, 3, ['n2']),
];

export const Landing: React.FC<{ onStart: () => void; onSignIn: () => void }> = ({ onStart, onSignIn }) => {
  useEffect(() => trackOnce('landing_view'), []);

  const start = () => {
    track('landing_cta_click');
    onStart();
  };

  const demo = useMemo(() => DEMO_NET, []);

  return (
    <div style={{ minHeight: '100vh', ...VOID_BACKGROUND, color: C.text, padding: '18px 20px 70px' }}>
      <div style={{ width: '100%', maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.18em', color: C.meta }}>FRONTIER</span>
          <button
            onClick={onSignIn}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: MONO_FONT,
              fontSize: 11,
              color: C.muted,
              cursor: 'pointer',
            }}
          >
            SIGN IN
          </button>
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <h1 className="fr-hero-title" style={{ fontFamily: DISPLAY_FONT, margin: 0, color: C.text }}>
            Chat is the wrong shape for thinking.
          </h1>
          <p style={{ color: C.muted, fontSize: 15.5, lineHeight: 1.62, margin: 0, maxWidth: 610 }}>
            Real invention branches, collides and dead-ends. A chat app gives you four hundred orphaned
            transcripts and no structure between them. Frontier makes the structure the thing you look
            at: a graph where every node is a conversation with an agent built to push outward, and the
            branches you have not taken stay lit.
          </p>
          <button onClick={start} style={primaryButton}>
            START FREE TRIAL
          </button>
          <span style={{ fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.1em', color: C.meta }}>
            3 DAYS FREE · THEN $20 / MONTH · CANCEL ANY TIME
          </span>
        </div>

        {/* The real canvas, running */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div className="fr-demo">
            <NetCanvas nodes={demo} activeId="n5" onSelect={() => undefined} />
          </div>
          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              padding: '11px 18px',
              fontSize: 12,
              color: C.muted,
              textAlign: 'center',
            }}
          >
            One plot, six conversations, and a Synthesist edge tying two branches that had not met.
          </div>
        </div>

        {/* How it works */}
        <div className="fr-landing-beats">
          {BEATS.map((beat, i) => (
            <div key={beat.title} style={card}>
              <div style={{ fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.12em', color: C.meta, marginBottom: 7 }}>
                STEP {i + 1}
              </div>
              <div style={{ fontSize: 15, fontWeight: 650, marginBottom: 6 }}>{beat.title}</div>
              <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>{beat.body}</div>
            </div>
          ))}
        </div>

        {/* The roster — the actual product differentiator */}
        <div style={card}>
          <div style={{ fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.12em', color: C.meta, marginBottom: 12 }}>
            FIVE AGENTS, NOT ONE ASSISTANT
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {AGENT_LIST.map(agent => (
              <div key={agent.role} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: agent.accent, flex: 'none' }} />
                <span style={{ fontFamily: MONO_FONT, fontSize: 11, color: agent.accent, minWidth: 104 }}>
                  {agent.name.toUpperCase()}
                </span>
                <span style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>{agent.tagline}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: C.meta, lineHeight: 1.55 }}>
            A single general-purpose assistant converges on the median of what has been written. Five
            agents with one job each, a refusal, and a bias toward the edge do not.
          </div>
        </div>

        {/* Price */}
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 23 }}>3 days free, then $20/mo</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6, marginBottom: 16, lineHeight: 1.6 }}>
            Try it for three days without paying. We take a card up front so it keeps working when the
            trial ends — cancel before then and you are not charged, and cancelling later takes two
            clicks. Unlimited plots, nodes and collisions, synced across your devices.
          </div>
          <button onClick={start} style={primaryButton}>
            OPEN THE NET
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: C.meta, lineHeight: 1.7 }}>
          Built for people who are trying to make something that does not exist yet.
          <br />
          If your dream is working at Amazon, Google, Microsoft, or OpenAI for the money — go fuck
          yourself, and GTFO.
        </div>
      </div>
    </div>
  );
};

const primaryButton: React.CSSProperties = {
  background: '#5eead4',
  border: 'none',
  borderRadius: 9,
  padding: '13px 26px',
  fontFamily: MONO_FONT,
  fontWeight: 700,
  fontSize: 12.5,
  letterSpacing: '0.06em',
  color: C.void,
  cursor: 'pointer',
};

const card: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: '16px 18px',
};
