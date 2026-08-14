import type { CSSProperties } from 'react';

/**
 * Design tokens for the book summarizer — warm and editorial rather than
 * Frontier's obsidian, since this is a surface for reading, not staring at a
 * graph. Serif display type reads as "publication," which is the point: a
 * chapter card should feel like a magazine spread, not a dashboard tile.
 */

export const C = {
  paper: '#faf6ef',
  paperDim: '#f1ebdd',
  ink: '#1f1b16',
  inkMuted: '#5a5245',
  inkFaint: '#948a76',
  border: '#e3dac6',
  surface: '#ffffff',
  accent: '#b5442e',
  accentSoft: '#f3ddd4',
  ok: '#4c7a5e',
} as const;

export const DISPLAY_FONT = "'Fraunces', Georgia, serif";
export const BODY_FONT = "'Inter', system-ui, -apple-system, sans-serif";
export const MONO_FONT = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";

export const PAPER_BACKGROUND: CSSProperties = { background: C.paper };

export const card: CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
};
