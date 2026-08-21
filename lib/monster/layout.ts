import type { MiniBoss } from './types';
import { COLORS } from './tokens';

/** Board height in px. Horizontal positions are percentages of board width. */
export const BOARD_H = 640;

export const GOAL_MONSTER_X = 50;
export const GOAL_MONSTER_CENTER_Y = 95;
export const GOAL_MONSTER_SIZE = 130;

export const ACTIVE_BOSS_Y = 349;
export const ACTIVE_BOSS_SIZE = 120;

export const ORBIT_R = 150;
export const MILK_CELL = 62;
export const MILK_HALF = MILK_CELL / 2;
export const RING_PAD = 8;

export const ADD_BOSS_X = 7;
export const ADD_BOSS_CENTER_Y = 250;

export type NodeKind = 'dead' | 'active' | 'next';

export interface NodePos {
  /** Percentage of board width. */
  x: number;
  /** Centre of the node, in px from the top of the board. */
  y: number;
  size: number;
  kind: NodeKind;
}

export interface ConnectorLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  width: number;
  dash: string;
}

export interface BoardLayout {
  positions: Record<number, NodePos>;
  lines: ConnectorLine[];
  /** Indices of upcoming (non-defeated, non-active) bosses, in chain order. */
  upcoming: number[];
  defeated: number[];
  goalMonsterSize: number;
}

/** px → viewBox units for the 0 0 100 100 connector SVG. */
export function toViewBoxY(px: number): number {
  return (px / BOARD_H) * 100;
}

/**
 * The active boss's name label has to stay inside the Milk orbit ring, so its
 * width is the chord of the clear circle at the label's lowest point.
 */
export function activeLabelWidth(): number {
  const clearR = ORBIT_R - MILK_HALF - RING_PAD;
  const labelBottom = ACTIVE_BOSS_SIZE / 2 + 4 + 30;
  return 2 * Math.floor(Math.sqrt(Math.max(900, clearR * clearR - labelBottom * labelBottom)));
}

/**
 * Places every node on the board and chains them with connector lines:
 * defeated → active → upcoming → goal monster.
 */
export function computeLayout(miniBosses: MiniBoss[], activeIndex: number): BoardLayout {
  const order = miniBosses.map((mb, i) => ({ mb, i }));
  const defeatedArr = order.filter(o => o.mb.defeated);
  const upcomingArr = order.filter(o => !o.mb.defeated && o.i !== activeIndex);
  const activeBoss = miniBosses[activeIndex];

  const positions: Record<number, NodePos> = {};

  // Defeated bosses lie along the bottom of the board, left to right.
  const deadStep = Math.min(11, 80 / Math.max(1, defeatedArr.length));
  defeatedArr.forEach((o, k) => {
    positions[o.i] = { x: 8 + k * deadStep, y: 615, size: 36, kind: 'dead' };
  });

  if (activeBoss) {
    positions[activeIndex] = { x: GOAL_MONSTER_X, y: ACTIVE_BOSS_Y, size: ACTIVE_BOSS_SIZE, kind: 'active' };
  }

  // Upcoming bosses stack bottom-up on the right.
  const un = upcomingArr.length;
  const upStep = Math.max(78, Math.min(120, 460 / Math.max(1, un)));
  const upSize = Math.max(36, Math.min(56, Math.round(upStep - 62)));
  const upBottomY = Math.min(560, 150 + (un - 1) * upStep);
  upcomingArr.forEach((o, k) => {
    positions[o.i] = { x: 88, y: Math.round(upBottomY - k * upStep), size: upSize, kind: 'next' };
  });

  const chain = [
    ...defeatedArr.map(o => o.i),
    ...(activeBoss ? [activeIndex] : []),
    ...upcomingArr.map(o => o.i),
  ];

  const lines: ConnectorLine[] = [];
  for (let k = 0; k < chain.length - 1; k++) {
    const a = positions[chain[k]];
    const b = positions[chain[k + 1]];
    const leavingDefeated = miniBosses[chain[k]].defeated;
    lines.push({
      x1: a.x,
      y1: toViewBoxY(a.y),
      x2: b.x,
      y2: toViewBoxY(b.y),
      stroke: leavingDefeated ? COLORS.dashedLine : COLORS.chainLine,
      width: 0.35,
      dash: leavingDefeated ? '3,3' : '',
    });
  }
  if (chain.length) {
    const last = positions[chain[chain.length - 1]];
    lines.push({
      x1: last.x,
      y1: toViewBoxY(last.y),
      x2: GOAL_MONSTER_X,
      y2: toViewBoxY(GOAL_MONSTER_CENTER_Y),
      stroke: COLORS.chainLine,
      width: 0.35,
      dash: '',
    });
  }

  // The goal monster shrinks to 75% of its base size as bosses fall.
  const total = miniBosses.length;
  const hpFrac = total > 0 ? 1 - defeatedArr.length / total : 1;
  const goalMonsterSize = Math.round(GOAL_MONSTER_SIZE * (1 - (1 - hpFrac) * 0.25));

  return {
    positions,
    lines,
    upcoming: upcomingArr.map(o => o.i),
    defeated: defeatedArr.map(o => o.i),
    goalMonsterSize,
  };
}
