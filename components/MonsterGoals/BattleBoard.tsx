import React from 'react';
import type { CSSProperties } from 'react';
import type { MiniBoss } from '../../lib/monster/types';
import { BLOB_RADIUS, COLORS, DISPLAY_FONT, GOAL_BLOB_RADIUS } from '../../lib/monster/tokens';
import {
  ACTIVE_BOSS_Y,
  ADD_BOSS_CENTER_Y,
  ADD_BOSS_X,
  BOARD_H,
  GOAL_MONSTER_CENTER_Y,
  GOAL_MONSTER_X,
  activeLabelWidth,
  computeLayout,
} from '../../lib/monster/layout';
import { charSum } from '../../lib/monster/naming';
import { HeroFace, MonsterFace } from './MonsterFace';
import { MilkUnit } from './MilkUnit';

/** Absolutely-positioned, horizontally centred box — the board's placement primitive. */
function faceBox(xPercent: number, topPx: number, size: number, extra: CSSProperties): CSSProperties {
  return {
    position: 'absolute',
    left: `${xPercent}%`,
    top: topPx,
    width: size,
    height: size,
    transform: 'translate(-50%, 0)',
    ...extra,
  };
}

export interface AttackFx {
  x: number;
  /** In viewBox units (0–100), matching the connector SVG. */
  y: number;
}

interface BattleBoardProps {
  monsterName: string;
  miniBosses: MiniBoss[];
  activeIndex: number;
  defeatingId: string | null;
  allDefeated: boolean;
  attackFx: AttackFx | null;
  hoverBossId: string | null;
  onHoverBoss: (id: string | null) => void;
  onSelectBoss: (index: number) => void;
  onAddBoss: () => void;
}

export const BattleBoard: React.FC<BattleBoardProps> = ({
  monsterName,
  miniBosses,
  activeIndex,
  defeatingId,
  allDefeated,
  attackFx,
  hoverBossId,
  onHoverBoss,
  onSelectBoss,
  onAddBoss,
}) => {
  const { positions, lines, goalMonsterSize } = computeLayout(miniBosses, activeIndex);
  const activeBoss = miniBosses[activeIndex];
  const activePos = positions[activeIndex] ?? { x: GOAL_MONSTER_X, y: ACTIVE_BOSS_Y, size: 120, kind: 'active' as const };
  const labelW = activeLabelWidth();
  const deployed = activeBoss ? activeBoss.tasks.filter(t => t.done) : [];

  return (
    <div style={{ position: 'relative', width: '100%', height: BOARD_H }}>
      <svg
        style={{ position: 'absolute', inset: 0 }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        width="100%"
        height="100%"
      >
        {lines.map((ln, i) => (
          <line
            key={i}
            x1={ln.x1}
            y1={ln.y1}
            x2={ln.x2}
            y2={ln.y2}
            stroke={ln.stroke}
            strokeWidth={ln.width}
            strokeDasharray={ln.dash || undefined}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {attackFx && (
        <div
          style={{
            position: 'absolute',
            left: `${attackFx.x}%`,
            top: (attackFx.y / 100) * BOARD_H,
            width: 16,
            height: 16,
            marginLeft: -8,
            marginTop: -8,
            borderRadius: '50%',
            background: COLORS.terminalTip,
            border: `2px solid ${COLORS.ink}`,
            transition: 'left 0.55s ease, top 0.55s ease',
            zIndex: 5,
          }}
        />
      )}

      {/* The goal monster — looms behind everything, shrinking as bosses fall. */}
      <div
        style={faceBox(GOAL_MONSTER_X, GOAL_MONSTER_CENTER_Y - goalMonsterSize / 2, goalMonsterSize, {
          borderRadius: GOAL_BLOB_RADIUS,
          background: COLORS.surface,
          border: `3px solid ${COLORS.ink}`,
          opacity: allDefeated ? 0.2 : 0.32,
          filter: 'blur(1px)',
          animation: 'floatIdle 3.5s ease-in-out infinite',
          zIndex: 0,
        })}
      >
        <HeroFace />
      </div>
      <div
        style={{
          zIndex: 5,
          position: 'absolute',
          left: `${GOAL_MONSTER_X}%`,
          top: Math.max(2, GOAL_MONSTER_CENTER_Y - goalMonsterSize / 2 - 24),
          transform: 'translateX(-50%)',
          fontFamily: DISPLAY_FONT,
          fontWeight: 700,
          fontSize: 15,
          whiteSpace: 'nowrap',
        }}
      >
        {monsterName}
      </div>

      {miniBosses.map((mb, i) => {
        const defeating = defeatingId === mb.id;
        const active = i === activeIndex;
        const p = positions[i] ?? { x: 50, y: ACTIVE_BOSS_Y, size: 120, kind: 'next' as const };
        // A boss playing its defeat animation snaps back to the active slot at
        // full size for the duration of the animation.
        const size = defeating ? 120 : p.size;
        const px = defeating ? 50 : p.x;
        const py = defeating ? ACTIVE_BOSS_Y : p.y;
        const isDead = p.kind === 'dead';
        const emphasised = active || defeating;
        const ink = emphasised ? COLORS.ink : COLORS.inkInactive;
        const opacity = defeating ? 1 : active ? 1 : isDead ? 0.4 : 0.22;
        const variant = charSum(mb.id, i) % 4;

        return (
          <React.Fragment key={mb.id}>
            <div
              onClick={() => onSelectBoss(i)}
              onMouseEnter={() => onHoverBoss(mb.id)}
              onMouseLeave={() => onHoverBoss(null)}
              style={faceBox(px, py - size / 2, size, {
                borderRadius: BLOB_RADIUS,
                background: isDead && !defeating ? COLORS.defeatedFill : COLORS.surface,
                border: `${emphasised ? 3 : 2}px solid ${emphasised ? COLORS.ink : COLORS.mutedBorder}`,
                opacity,
                cursor: 'pointer',
                zIndex: defeating ? 6 : active ? 3 : 1,
                filter: emphasised || isDead ? 'none' : 'blur(1.5px)',
                boxShadow: active ? '0 0 0 4px rgba(43,43,43,0.08)' : 'none',
                ...(defeating ? { animation: 'bossDefeat 1.3s ease-in-out forwards' } : {}),
              })}
            >
              {(!mb.defeated || defeating) && <MonsterFace variant={variant} ink={ink} />}
              {mb.defeated && !defeating && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    color: COLORS.mutedBorder,
                  }}
                >
                  ✓
                </div>
              )}
            </div>

            {!isDead && (
              <div
                style={
                  p.kind === 'next'
                    ? {
                        position: 'absolute',
                        left: `${px}%`,
                        top: py - size / 2 - 8,
                        transform: 'translate(-50%, -100%)',
                        width: 132,
                        textAlign: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: 1.3,
                        opacity,
                        zIndex: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }
                    : {
                        position: 'absolute',
                        left: `${px}%`,
                        top: py + size / 2 + 4,
                        transform: 'translateX(-50%)',
                        width: labelW,
                        maxHeight: 30,
                        textAlign: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1.25,
                        opacity,
                        zIndex: 3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }
                }
              >
                {mb.name}
                <br />
                <span style={{ opacity: 0.7, fontSize: 10 }}>
                  {mb.defeated ? 'Defeated' : `${mb.hp}/${mb.maxHp} HP`}
                </span>
              </div>
            )}

            {hoverBossId === mb.id && (
              <div
                style={{
                  position: 'absolute',
                  left: `${px}%`,
                  top: py - (active ? 100 : size / 2 + 44),
                  transform: 'translateX(-50%)',
                  background: COLORS.terminalBg,
                  color: COLORS.terminalTip,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '7px 11px',
                  borderRadius: 6,
                  whiteSpace: 'nowrap',
                  maxWidth: 280,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  zIndex: 9,
                  pointerEvents: 'none',
                }}
              >
                {mb.goalText || mb.name}
              </div>
            )}
          </React.Fragment>
        );
      })}

      <div
        onClick={onAddBoss}
        title="Add sub-goal"
        style={faceBox(ADD_BOSS_X, ADD_BOSS_CENTER_Y - 24, 48, {
          borderRadius: 14,
          border: `2px dashed ${COLORS.mutedText}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          color: COLORS.mutedText,
          cursor: 'pointer',
          background: COLORS.paper,
          zIndex: 2,
        })}
      >
        +
      </div>
      <div
        style={{
          position: 'absolute',
          left: `${ADD_BOSS_X}%`,
          top: ADD_BOSS_CENTER_Y + 28,
          transform: 'translateX(-50%)',
          fontSize: 11,
          color: COLORS.mutedText,
          width: 90,
          textAlign: 'center',
          zIndex: 2,
        }}
      >
        Add sub-goal
      </div>

      {deployed.map((t, i) => (
        <MilkUnit key={t.id} taskId={t.id} text={t.text} index={i} count={deployed.length} bossX={activePos.x} />
      ))}
    </div>
  );
};
