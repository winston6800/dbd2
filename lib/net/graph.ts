import type { ConvNode } from './types';
import { scoreNet } from './frontier';

/**
 * Force-directed layout for the net.
 *
 * Written by hand rather than pulled from d3-force for two reasons: the whole
 * simulation is ~60 lines and it has to be *deterministic*. A layout seeded
 * with Math.random re-arranges itself every time the component remounts, which
 * destroys the one thing a spatial view is for — you remembering where things
 * are. Same net in, same picture out, every time.
 *
 * The seed is a radial tree by depth, which is already close to the answer, so
 * the simulation only has to relieve crowding rather than untangle a hairball.
 */

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  /** Draw radius, grown by transcript length and frontier heat. */
  r: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  /** Lateral links are drawn differently — they are the interesting ones. */
  kind: 'parent' | 'link';
}

export interface NetLayout {
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

const ITERATIONS = 320;
const REPULSION = 5200;
const CENTER_PULL = 0.0055;
const DAMPING = 0.82;
const RING = 135;

const SPRING = {
  parent: { length: 128, k: 0.045 },
  link: { length: 205, k: 0.011 },
} as const;

/** Deterministic 32-bit string hash — stands in for the RNG a seed would need. */
export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function edgesOf(nodes: ConvNode[]): GraphEdge[] {
  const present = new Set(nodes.map(n => n.id));
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    if (node.parentId && present.has(node.parentId)) {
      edges.push({ source: node.parentId, target: node.id, kind: 'parent' });
    }
    for (const other of node.links) {
      if (!present.has(other) || other === node.id) continue;
      // Links are conceptually undirected; keep one edge per unordered pair.
      const key = [node.id, other].sort().join('~');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source: node.id, target: other, kind: 'link' });
    }
  }

  return edges;
}

function radiusOf(node: ConvNode, heat: number): number {
  const body = Math.min(11, node.messages.length * 1.6);
  return 15 + body + heat * 7;
}

/**
 * Runs the simulation and returns final positions, centred on the origin.
 */
export function layoutNet(nodes: ConvNode[]): NetLayout {
  const edges = edgesOf(nodes);
  const scores = scoreNet(nodes);

  if (nodes.length === 0) {
    return { nodes: {}, edges, bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
  }

  // --- seed: radial tree, angle from a stable hash of the id ---
  const depths = new Map(Object.values(scores).map(s => [s.nodeId, s.depth]));
  const pos = new Map<string, { x: number; y: number; vx: number; vy: number; r: number }>();

  for (const node of nodes) {
    const depth = depths.get(node.id) ?? 0;
    const angle = (hash(node.id) % 3600) / 3600 * Math.PI * 2;
    // Jitter keeps two same-depth nodes from landing on the same point, where
    // the repulsion term would divide by zero.
    const radius = depth * RING + (hash(node.id + '~r') % 40) - 20;
    pos.set(node.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      r: radiusOf(node, scores[node.id]?.heat ?? 0),
    });
  }

  const ids = nodes.map(n => n.id);

  for (let step = 0; step < ITERATIONS; step++) {
    // Repulsion — every pair pushes apart, falling off with distance squared.
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos.get(ids[i])!;
        const b = pos.get(ids[j])!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist2 = dx * dx + dy * dy;

        if (dist2 < 0.01) {
          // Coincident: nudge along a stable direction so it stays deterministic.
          dx = ((hash(ids[i] + ids[j]) % 100) - 50) / 50 || 1;
          dy = ((hash(ids[j] + ids[i]) % 100) - 50) / 50 || 1;
          dist2 = dx * dx + dy * dy;
        }

        const dist = Math.sqrt(dist2);
        const force = REPULSION / dist2;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // Springs — parent edges hold the tree together, lateral links pull softly
    // so a synthesis edge bends the layout without collapsing the branches.
    for (const edge of edges) {
      const a = pos.get(edge.source);
      const b = pos.get(edge.target);
      if (!a || !b) continue;

      const spec = SPRING[edge.kind];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = (dist - spec.length) * spec.k;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Gravity toward the origin, so disconnected pieces cannot drift to infinity.
    for (const id of ids) {
      const p = pos.get(id)!;
      p.vx -= p.x * CENTER_PULL;
      p.vy -= p.y * CENTER_PULL;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= DAMPING;
      p.vy *= DAMPING;
    }
  }

  // Re-centre on the centroid so the view does not depend on where it settled.
  let cx = 0;
  let cy = 0;
  for (const id of ids) {
    cx += pos.get(id)!.x;
    cy += pos.get(id)!.y;
  }
  cx /= ids.length;
  cy /= ids.length;

  const out: Record<string, GraphNode> = {};
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const id of ids) {
    const p = pos.get(id)!;
    const x = p.x - cx;
    const y = p.y - cy;
    out[id] = { id, x, y, r: p.r };
    minX = Math.min(minX, x - p.r);
    minY = Math.min(minY, y - p.r);
    maxX = Math.max(maxX, x + p.r);
    maxY = Math.max(maxY, y + p.r);
  }

  return { nodes: out, edges, bounds: { minX, minY, maxX, maxY } };
}

/**
 * viewBox that frames the whole net with padding, for an SVG that scales to
 * whatever space the canvas has.
 */
export function viewBoxFor(layout: NetLayout, pad = 70): string {
  const { minX, minY, maxX, maxY } = layout.bounds;
  if (!isFinite(minX)) return '-300 -200 600 400';

  const w = Math.max(320, maxX - minX + pad * 2);
  const h = Math.max(240, maxY - minY + pad * 2);
  return `${minX - pad} ${minY - pad} ${w} ${h}`;
}
