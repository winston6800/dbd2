import { describe, expect, it } from 'vitest';
import {
  ACTIVE_BOSS_SIZE,
  ACTIVE_BOSS_Y,
  BOARD_H,
  activeLabelWidth,
  computeLayout,
  toViewBoxY,
} from './layout';
import { MAX_HP } from './types';
import type { MiniBoss } from './types';
import { COLORS } from './tokens';

function boss(id: string, overrides: Partial<MiniBoss> = {}): MiniBoss {
  return { id, name: id, goalText: id, maxHp: MAX_HP, hp: MAX_HP, defeated: false, tasks: [], ...overrides };
}

describe('toViewBoxY', () => {
  it('maps board px onto the 0-100 viewBox', () => {
    expect(toViewBoxY(0)).toBe(0);
    expect(toViewBoxY(BOARD_H)).toBe(100);
    expect(toViewBoxY(320)).toBe(50);
  });
});

describe('activeLabelWidth', () => {
  it('keeps the active label inside the Milk orbit ring', () => {
    // clearR = 150 - 31 - 8 = 111; labelBottom = 60 + 4 + 30 = 94
    // 2 * floor(sqrt(111^2 - 94^2)) = 2 * floor(59.03) = 118
    expect(activeLabelWidth()).toBe(118);
  });
});

describe('computeLayout', () => {
  it('centres the active boss and stacks upcoming bosses on the right', () => {
    const { positions } = computeLayout([boss('a'), boss('b'), boss('c')], 0);

    expect(positions[0]).toEqual({ x: 50, y: ACTIVE_BOSS_Y, size: ACTIVE_BOSS_SIZE, kind: 'active' });
    expect(positions[1].x).toBe(88);
    expect(positions[2].x).toBe(88);
    expect(positions[1].kind).toBe('next');
    // Upcoming stack bottom-up, so the first one sits lower on the board.
    expect(positions[1].y).toBeGreaterThan(positions[2].y);
  });

  it('clamps upcoming node size and step to the documented ranges', () => {
    const many = Array.from({ length: 12 }, (_, i) => boss(`b${i}`));
    const { positions } = computeLayout(many, 0);
    const upcoming = Object.values(positions).filter(p => p.kind === 'next');

    expect(upcoming).toHaveLength(11);
    for (const p of upcoming) {
      expect(p.size).toBeGreaterThanOrEqual(36);
      expect(p.size).toBeLessThanOrEqual(56);
      expect(p.y).toBeLessThanOrEqual(560);
    }
  });

  it('lays defeated bosses along the bottom with a capped step', () => {
    const bosses = [boss('a', { defeated: true, hp: 0 }), boss('b', { defeated: true, hp: 0 }), boss('c')];
    const { positions, defeated } = computeLayout(bosses, 2);

    expect(defeated).toEqual([0, 1]);
    expect(positions[0]).toEqual({ x: 8, y: 615, size: 36, kind: 'dead' });
    expect(positions[1].x).toBe(19); // 8 + min(11, 80/2)
    expect(positions[1].y).toBe(615);
  });

  it('chains defeated -> active -> upcoming -> goal monster', () => {
    const bosses = [boss('a', { defeated: true, hp: 0 }), boss('b'), boss('c')];
    const { lines } = computeLayout(bosses, 1);

    // 2 inter-node segments + 1 segment up to the goal monster.
    expect(lines).toHaveLength(3);
    // The segment leaving a defeated boss is dashed and grey.
    expect(lines[0].stroke).toBe(COLORS.dashedLine);
    expect(lines[0].dash).toBe('3,3');
    // Live segments are solid ink.
    expect(lines[1].stroke).toBe(COLORS.chainLine);
    expect(lines[1].dash).toBe('');
    // The last segment terminates at the goal monster.
    expect(lines[2].x2).toBe(50);
    expect(lines[2].y2).toBeCloseTo(toViewBoxY(95));
  });

  it('shrinks the goal monster to 75% as every boss falls', () => {
    const alive = computeLayout([boss('a'), boss('b')], 0);
    expect(alive.goalMonsterSize).toBe(130);

    const half = computeLayout([boss('a', { defeated: true, hp: 0 }), boss('b')], 1);
    expect(half.goalMonsterSize).toBe(114); // 130 * (1 - 0.5 * 0.25)

    const dead = computeLayout(
      [boss('a', { defeated: true, hp: 0 }), boss('b', { defeated: true, hp: 0 })],
      0,
    );
    expect(dead.goalMonsterSize).toBe(98); // 130 * 0.75, rounded
  });

  it('handles a goal with no mini-bosses', () => {
    const { positions, lines, goalMonsterSize } = computeLayout([], 0);
    expect(positions).toEqual({});
    expect(lines).toEqual([]);
    expect(goalMonsterSize).toBe(130);
  });
});
