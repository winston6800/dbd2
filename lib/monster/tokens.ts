import type { CSSProperties } from 'react';

/**
 * Monster Goals design tokens.
 *
 * The palette is black and red: a near-black ground, one vivid red that carries
 * every accent, and bright ink for type and outlines. Radii, geometry and the
 * animation values below still come verbatim from the design handoff — only the
 * colours were re-cut for this theme, so change hues here rather than in the
 * components.
 */

/** The one red. Everything red on screen is this, dimmed, or lifted. */
const RED = '#ff1f3d';
const RED_BRIGHT = '#ff5470';
const RED_SOFT = '#ff8fa3';
const RED_DEEP = '#8e0f22';
const BLACK = '#08070a';

/** Red glow ring used for whatever the player is currently fighting. */
export const ACTIVE_GLOW = '0 0 0 4px rgba(255, 31, 61, 0.22), 0 0 30px rgba(255, 31, 61, 0.38)';

export const COLORS = {
  paper: BLACK,
  gridLine: '#1b0f14',
  ink: '#fff4f5',
  inkInactive: '#7d5a62',
  mutedBorder: '#6d2432',
  mutedText: '#b9a4aa',
  metaText: RED_BRIGHT,
  doneText: '#7f666d',
  surface: '#111013',
  inputFill: '#1a1116',
  defeatedFill: '#241318',
  track: '#2b171e',
  dashedLine: '#6a2733',
  formBorder: '#54202b',
  /** Panels, inputs and secondary buttons: red outlines, so the white-bordered
   *  call to action stays the loudest thing on any screen. */
  cardBorder: '#8e0f22',
  /** Primary call to action — red fill, ink border, ink label. */
  ctaFill: RED,
  doneGlyph: RED_BRIGHT,
  doneFill: '#3d0f1b',
  /** Monster faces and the chain between bosses: red on black. */
  monsterInk: RED,
  monsterInkInactive: RED_DEEP,
  chainLine: RED,
  /** Milk cartons stay white, so their outlines and faces go dark instead. */
  cartonInk: '#0a080b',
  terminalBg: '#0c0a0d',
  terminalBorder: '#000000',
  terminalInput: '#151016',
  terminalLine: '#43151f',
  terminalText: '#ffe8ec',
  terminalLabel: RED_SOFT,
  terminalTip: '#fff4f5',
  signalDot: RED,
  actionFill: RED,
  milkBadge: RED_SOFT,
  danger: RED_BRIGHT,
  dangerFill: '#2a0b12',
  dangerText: '#ffc2cb',
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

/**
 * 28px graph paper on black, lit by a red bloom from the top of the page. The
 * background shorthand only carries the colour — the layers are listed in
 * `backgroundImage` so the glow can sit unrepeated over the tiled grid.
 */
export const PAPER_BACKGROUND: CSSProperties = {
  background: COLORS.paper,
  backgroundImage: [
    'radial-gradient(120% 70% at 50% -10%, rgba(255, 31, 61, 0.22), transparent 62%)',
    `linear-gradient(${COLORS.gridLine} 1px, transparent 1px)`,
    `linear-gradient(90deg, ${COLORS.gridLine} 1px, transparent 1px)`,
  ].join(', '),
  backgroundSize: '100% 100%, 28px 28px, 28px 28px',
  backgroundRepeat: 'no-repeat, repeat, repeat',
  backgroundAttachment: 'fixed, scroll, scroll',
};

/** Milk carton body / cap tints, indexed by task-id hash. */
export const MILK_BODY_TINTS = ['#ffffff', '#fff1f3', '#ffe6ea', '#fbf7f8'] as const;
export const MILK_CAP_TINTS = ['#ff1f3d', '#ff5470', '#c81232', '#ff8fa3'] as const;

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
  { count: 3, w: 7, h: 7, radius: '50%', cycle: 0.95, gap: 0.11, anim: 'pelletToCenter', bg: '#ff1f3d' },
  { count: 2, w: 11, h: 11, radius: '3px', cycle: 1.5, gap: 0.16, anim: 'pelletSpin', bg: '#ff5470' },
  { count: 4, w: 5, h: 12, radius: '3px', cycle: 0.7, gap: 0.07, anim: 'pelletToCenter', bg: '#ff2d4f' },
  {
    count: 1,
    w: 15,
    h: 14,
    radius: '55% 45% 50% 50% / 55% 55% 45% 45%',
    cycle: 1.7,
    gap: 0.2,
    anim: 'pelletWobble',
    bg: '#ff8fa3',
  },
];
