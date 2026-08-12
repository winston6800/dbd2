import React, { useMemo } from 'react';
import type { ConvNode } from '../../lib/net/types';
import { layoutNet, viewBoxFor } from '../../lib/net/graph';
import { scoreNet } from '../../lib/net/frontier';
import { agentOf } from '../../lib/net/agents';
import { C, MONO_FONT, heatColor } from '../../lib/net/tokens';

/**
 * The net itself.
 *
 * Rendered as one SVG with a computed viewBox rather than a pan/zoom canvas:
 * the whole graph is always in frame, which is the property that makes it
 * useful at a glance. Layout is deterministic (see graph.ts), so a node stays
 * where you remember it across reloads.
 */

interface Props {
  nodes: ConvNode[];
  activeId: string | null;
  /** Highlighted as the other half of a pending collision. */
  collideWith?: string | null;
  onSelect: (id: string) => void;
}

export const NetCanvas: React.FC<Props> = ({ nodes, activeId, collideWith, onSelect }) => {
  // Layout is O(n²) per pass, so it is recomputed only when the graph's shape
  // or heat actually changes — not on every keystroke in the panel.
  const shapeKey = nodes
    .map(n => `${n.id}:${n.parentId ?? ''}:${n.links.join('|')}:${n.messages.length}:${n.forks.filter(f => !f.taken).length}:${n.resolved ? 1 : 0}`)
    .join(',');

  const layout = useMemo(() => layoutNet(nodes), [shapeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const scores = useMemo(() => scoreNet(nodes), [shapeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  if (!nodes.length) return null;

  return (
    <svg
      viewBox={viewBoxFor(layout)}
      style={{ width: '100%', height: '100%', display: 'block' }}
      role="img"
      aria-label={`Thinking net, ${nodes.length} conversations`}
    >
      <defs>
        <filter id="nodeGlow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Edges first so nodes sit on top of them. */}
      <g>
        {layout.edges.map(edge => {
          const a = layout.nodes[edge.source];
          const b = layout.nodes[edge.target];
          if (!a || !b) return null;

          const lateral = edge.kind === 'link';
          return (
            <line
              key={`${edge.source}~${edge.target}~${edge.kind}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={lateral ? C.edgeLink : C.edge}
              strokeWidth={lateral ? 1.6 : 1.2}
              strokeDasharray={lateral ? '5 5' : undefined}
              opacity={lateral ? 0.85 : 0.6}
            />
          );
        })}
      </g>

      <g>
        {nodes.map(node => {
          const pos = layout.nodes[node.id];
          if (!pos) return null;

          const score = scores[node.id];
          const agent = agentOf(node.agent);
          const isActive = node.id === activeId;
          const isCollide = node.id === collideWith;
          const heat = score?.heat ?? 0;

          return (
            <g
              key={node.id}
              onClick={() => onSelect(node.id)}
              style={{ cursor: 'pointer' }}
              role="button"
              aria-label={`${agent.name}: ${node.title}`}
            >
              {/* Heat halo — the frontier is literally what glows. */}
              {score?.isFrontier && heat > 0.15 && (
                <circle cx={pos.x} cy={pos.y} r={pos.r + 6} fill={heatColor(heat)} opacity={heat * 0.28} filter="url(#nodeGlow)" />
              )}

              <circle
                cx={pos.x}
                cy={pos.y}
                r={pos.r}
                fill={node.resolved ? C.raised : C.surface}
                stroke={isCollide ? C.edgeLink : isActive ? agent.accent : node.resolved ? C.border : agent.accent}
                strokeWidth={isActive || isCollide ? 3 : 1.5}
                opacity={node.resolved ? 0.75 : 1}
              />

              {/* Agent dot — reading the roster off the graph without labels. */}
              <circle cx={pos.x} cy={pos.y - pos.r * 0.32} r={3.2} fill={agent.accent} opacity={node.resolved ? 0.5 : 0.95} />

              {/* Untaken forks, as ticks around the rim: visible potential energy. */}
              {Array.from({ length: Math.min(4, score?.openForks ?? 0) }).map((_, i, arr) => {
                const angle = (-90 + (i - (arr.length - 1) / 2) * 26) * (Math.PI / 180);
                const x1 = pos.x + Math.cos(angle) * (pos.r + 3);
                const y1 = pos.y + Math.sin(angle) * (pos.r + 3);
                const x2 = pos.x + Math.cos(angle) * (pos.r + 9);
                const y2 = pos.y + Math.sin(angle) * (pos.r + 9);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={heatColor(heat)} strokeWidth={1.6} opacity={0.9} />;
              })}

              <text
                x={pos.x}
                y={pos.y + pos.r + 15}
                textAnchor="middle"
                fill={isActive ? C.text : C.muted}
                fontSize={11}
                fontFamily={MONO_FONT}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {truncate(node.title, 22)}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );

  function truncate(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }
};

/** Legend for the roster, so the accent colours mean something on first sight. */
export const AgentLegend: React.FC = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 10, fontFamily: MONO_FONT, color: C.meta }}>
    {['cartographer', 'adversary', 'synthesist', 'artificer', 'historian'].map(role => {
      const agent = agentOf(role as never);
      return (
        <span key={role} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: agent.accent }} />
          {agent.name.toUpperCase()}
        </span>
      );
    })}
  </div>
);
