import type { CSSProperties } from 'react';

/**
 * Frontier design tokens — obsidian.
 *
 * A deliberate inversion of the old paper-and-ink board. This is a tool you
 * stare into for an hour at a time while thinking, so the surface recedes and
 * the only things that emit light are the nodes and their heat.
 */

export const C = {
  void: '#0a0c0f',
  grid: '#141920',
  surface: '#111620',
  raised: '#161d28',
  border: '#232c3a',
  borderBright: '#33405288',

  text: '#dfe6ef',
  muted: '#8b97a8',
  meta: '#5c6675',
  dim: '#3d4655',

  edge: '#2b3646',
  edgeLink: '#7c5cbf',

  danger: '#fb7185',
  ok: '#34d399',
} as const;

/** Cold → hot ramp for frontier heat. */
export const HEAT = ['#31405a', '#3f6f8f', '#4fa3a0', '#8fbf6a', '#e0b44c', '#f0779a'] as const;

export function heatColor(heat: number): string {
  const idx = Math.min(HEAT.length - 1, Math.max(0, Math.round(heat * (HEAT.length - 1))));
  return HEAT[idx];
}

export const DISPLAY_FONT = "'Space Grotesk', 'Inter', system-ui, sans-serif";
export const BODY_FONT = "'Inter', system-ui, -apple-system, sans-serif";
export const MONO_FONT = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";

/** 32px grid, barely visible — depth without decoration. */
export const VOID_BACKGROUND: CSSProperties = {
  background: C.void,
  backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
  backgroundSize: '32px 32px',
};

export const panel: CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
};
