import type { CSSProperties } from 'react';

/**
 * Monster Goals design tokens.
 *
 * Values are taken verbatim from the design handoff (`README.md` → Design Tokens)
 * and the prototype. Nothing here should be tweaked without a design change.
 */

export const COLORS = {
  paper: '#f3f0e8',
  gridLine: '#e7e2d5',
  ink: '#2b2b2b',
  inkInactive: '#4a463e',
  mutedBorder: '#8a8578',
  mutedText: '#6b665c',
  metaText: '#a09a8a',
  doneText: '#a8a290',
  surface: '#fff',
  inputFill: '#faf8f2',
  defeatedFill: '#d8d4c6',
  track: '#e3e0d5',
  dashedLine: '#c9c4b6',
  formBorder: '#cfc9ba',
  successGreen: '#a7d4a0',
  doneGlyph: '#4f7a49',
  doneFill: '#dfe9e0',
  terminalBg: '#23282b',
  terminalBorder: '#101315',
  terminalInput: '#171b1d',
  terminalLine: '#3a4247',
  terminalText: '#d8e2e6',
  terminalLabel: '#8fa3ab',
  terminalTip: '#eef2f7',
  signalGreen: '#6fbf5a',
  actionYellow: '#c9c04a',
  milkBadge: '#7a8fa8',
} as const;

/** Irregular blob used for monster bodies. */
export const BLOB_RADIUS = '48% 52% 45% 55% / 55% 45% 58% 42%';
/** The goal monster on the battle board uses a slightly rounder blob. */
export const GOAL_BLOB_RADIUS = '46% 54% 50% 50% / 55% 45% 55% 45%';
/** Milk carton body. */
export const CARTON_RADIUS = '26% 26% 18% 18% / 34% 34% 14% 14%';

/** Jagged-teeth mouth used by the hero monster and face variant 0. */
export const TEETH_CLIP =
  'polygon(0% 30%,8% 0%,17% 55%,25% 5%,33% 55%,42% 0%,50% 55%,58% 0%,67% 55%,75% 5%,83% 55%,92% 0%,100% 30%,100% 100%,0% 100%)';

export const DISPLAY_FONT = "'Kalam', cursive";
export const BODY_FONT = "'Nunito', sans-serif";

/** 28px graph paper, drawn as two linear gradients over the paper colour. */
export const PAPER_BACKGROUND: CSSProperties = {
  background: COLORS.paper,
  backgroundImage: `linear-gradient(${COLORS.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.gridLine} 1px, transparent 1px)`,
  backgroundSize: '28px 28px',
};

/** Milk carton body / cap tints, indexed by task-id hash. */
export const MILK_BODY_TINTS = ['#ffffff', '#fdf6e6', '#ecf6f0', '#f7eef5'] as const;
export const MILK_CAP_TINTS = ['#eef2f7', '#f2e2b8', '#cfe7da', '#eccfe2'] as const;

/** Firing patterns, indexed by the same task-id hash as the tints. */
export interface ShotPattern {
  count: number;
  w: number;
  h: number;
  radius: string;
  cycle: number;
  gap: number;
  anim: 'pelletToCenter' | 'pelletSpin' | 'pelletWobble';
  bg: string;
}

export const SHOT_PATTERNS: readonly ShotPattern[] = [
  { count: 3, w: 7, h: 7, radius: '50%', cycle: 0.95, gap: 0.11, anim: 'pelletToCenter', bg: '#eef2f7' },
  { count: 2, w: 11, h: 11, radius: '3px', cycle: 1.5, gap: 0.16, anim: 'pelletSpin', bg: '#f7e6b0' },
  { count: 4, w: 5, h: 12, radius: '3px', cycle: 0.7, gap: 0.07, anim: 'pelletToCenter', bg: '#cbe8d8' },
  {
    count: 1,
    w: 15,
    h: 14,
    radius: '55% 45% 50% 50% / 55% 55% 45% 45%',
    cycle: 1.7,
    gap: 0.2,
    anim: 'pelletWobble',
    bg: '#f2d3e6',
  },
];
