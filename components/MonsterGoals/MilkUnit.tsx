import React from 'react';
import type { CSSProperties } from 'react';
import {
  CARTON_RADIUS,
  COLORS,
  MILK_BODY_TINTS,
  MILK_CAP_TINTS,
  SHOT_PATTERNS,
} from '../../lib/monster/tokens';
import { ACTIVE_BOSS_Y, MILK_CELL, MILK_HALF, ORBIT_R } from '../../lib/monster/layout';
import { charSum } from '../../lib/monster/naming';

const ORBIT_DUR = 16;

interface MilkUnitProps {
  taskId: string;
  text: string;
  /** Index within the deployed list, used for even phase spacing. */
  index: number;
  count: number;
  /** Active boss x position, as a percentage of board width. */
  bossX: number;
}

/**
 * One Milk carton per completed task, orbiting the active boss at radius 150px
 * and firing pellets at it forever.
 *
 * The orbit is two nested `orbitSpin` animations: an outer arm that sweeps the
 * carton around the ring, and an inner wrapper running the same animation in
 * reverse so the carton itself stays upright. Both share the same negative
 * delay so they stay in lockstep.
 */
export const MilkUnit: React.FC<MilkUnitProps> = ({ taskId, text, index, count, bossX }) => {
  const v = charSum(taskId) % 4;
  const bodyTint = MILK_BODY_TINTS[v];
  const capTint = MILK_CAP_TINTS[v];
  const shot = SHOT_PATTERNS[v];
  const delay = (-(index / Math.max(1, count)) * ORBIT_DUR).toFixed(2);

  const outerStyle: CSSProperties = {
    position: 'absolute',
    left: `${bossX}%`,
    top: ACTIVE_BOSS_Y,
    width: 0,
    height: 0,
    zIndex: 4,
    animation: `orbitSpin ${ORBIT_DUR}s linear ${delay}s infinite normal`,
  };

  const spokeStyle: CSSProperties = {
    position: 'absolute',
    left: -MILK_HALF,
    top: -(ORBIT_R + MILK_HALF),
    width: MILK_CELL,
    height: MILK_CELL,
  };

  const counterStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
    animation: `orbitSpin ${ORBIT_DUR}s linear ${delay}s infinite reverse`,
  };

  const eyeStyle = (side: 'left' | 'right'): CSSProperties =>
    v === 1
      ? {
          position: 'absolute',
          [side]: '24%',
          top: '40%',
          width: 9,
          height: 5,
          borderTop: `2px solid ${COLORS.ink}`,
          borderRadius: '8px 8px 0 0',
        }
      : {
          position: 'absolute',
          [side]: '26%',
          top: '38%',
          width: v === 3 ? 9 : 7,
          height: v === 3 ? 9 : 7,
          borderRadius: '50%',
          background: COLORS.ink,
        };

  const mouthStyle: CSSProperties =
    v === 2
      ? {
          position: 'absolute',
          left: '50%',
          top: '62%',
          transform: 'translateX(-50%)',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: COLORS.ink,
        }
      : {
          position: 'absolute',
          left: '50%',
          top: '60%',
          transform: 'translateX(-50%)',
          width: 16,
          height: 8,
          border: `2px solid ${COLORS.ink}`,
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
        };

  return (
    <div style={outerStyle}>
      <div style={spokeStyle}>
        <div style={counterStyle}>
          <div
            style={{
              width: '78%',
              height: '100%',
              margin: '0 auto',
              borderRadius: CARTON_RADIUS,
              background: bodyTint,
              border: `2px solid ${COLORS.ink}`,
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: -8,
                transform: 'translateX(-50%)',
                width: '38%',
                height: 10,
                border: `2px solid ${COLORS.ink}`,
                borderBottom: 'none',
                borderRadius: '4px 4px 0 0',
                background: capTint,
              }}
            />
            <div style={eyeStyle('left')} />
            <div style={eyeStyle('right')} />
            <div style={mouthStyle} />
          </div>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '100%',
              marginTop: 4,
              transform: 'translateX(-50%)',
              width: 100,
              textAlign: 'center',
              fontSize: 11,
            }}
          >
            {text}
          </div>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '100%',
              marginBottom: 4,
              transform: 'translateX(-50%)',
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
              color: COLORS.milkBadge,
            }}
          >
            MILK
          </div>
        </div>

        {/* Purely decorative — pellets never apply damage. */}
        {Array.from({ length: shot.count }, (_, p) => (
          <div
            key={p}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: shot.w,
              height: shot.h,
              borderRadius: shot.radius,
              background: shot.bg,
              border: `1.5px solid ${COLORS.ink}`,
              animation: `${shot.anim} ${shot.cycle}s ease-out ${(index * 0.25 + p * shot.gap).toFixed(2)}s infinite`,
              zIndex: 3,
            }}
          />
        ))}
      </div>
    </div>
  );
};
