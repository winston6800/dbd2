import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Goal, MiniBoss } from '../../lib/monster/types';
import { MAX_HP, MILK_DMG } from '../../lib/monster/types';
import { COLORS, DISPLAY_FONT, PAPER_BACKGROUND } from '../../lib/monster/tokens';
import { ACTIVE_BOSS_Y, GOAL_MONSTER_X, toViewBoxY } from '../../lib/monster/layout';
import { aiMonsterName, localMonsterName } from '../../lib/monster/naming';
import { loadState, saveState } from '../../lib/monster/storage';
import { createBoardSaver, loadBoard } from '../../lib/monster/sync';
import { uid } from '../../lib/monster/ids';
import { BoardScaler } from './BoardScaler';
import { useAuth } from '../../lib/auth';
import { BattleBoard, type AttackFx } from './BattleBoard';
import { CreateGoalScreen } from './CreateGoalScreen';
import { AddBossForm } from './AddBossForm';
import { AddTaskBar } from './AddTaskBar';
import { TaskQueue } from './TaskQueue';
import { AccountBar } from './AccountBar';

const HIT_PARTICLE_MS = 600;
const DEFEAT_ANIM_MS = 1300;

export const MonsterGoalsApp: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [addingBoss, setAddingBoss] = useState(false);
  const [attackFx, setAttackFx] = useState<AttackFx | null>(null);
  const [defeatingId, setDefeatingId] = useState<string | null>(null);
  const [hoverBossId, setHoverBossId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const schedule = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const saver = useRef<ReturnType<typeof createBoardSaver> | null>(null);

  // Restore this user's board, cloud first. New users land on the Create Goal
  // screen — there is no demo seed in production.
  useEffect(() => {
    let cancelled = false;

    // The board only mounts behind the auth gate, so there is normally a user.
    // Fall back to a local-only load rather than showing an empty board if it
    // is ever rendered without one.
    if (!userId) {
      const local = loadState(null);
      setGoal(local?.goal ?? null);
      setActiveIndex(local?.activeIndex ?? 0);
      setHydrated(true);
      return;
    }

    saver.current = createBoardSaver(userId);

    void loadBoard(userId).then(saved => {
      if (cancelled) return;
      setGoal(saved?.goal ?? null);
      setActiveIndex(saved?.activeIndex ?? 0);
      setHydrated(true);
    });

    // A closing or backgrounded tab would otherwise drop a debounced write.
    const flush = () => saver.current?.flush();
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
      saver.current?.flush();
      saver.current = null;
    };
  }, [userId]);

  const persist = useCallback(
    (nextGoal: Goal | null, nextIndex: number) => {
      const state = { goal: nextGoal, activeIndex: nextIndex };
      if (saver.current) saver.current.save(state);
      else saveState(userId, state);
    },
    [userId],
  );

  const miniBosses = goal?.miniBosses ?? [];
  const total = miniBosses.length;
  const safeIndex = Math.min(activeIndex, Math.max(0, total - 1));
  const activeBoss: MiniBoss | undefined = miniBosses[safeIndex];
  const defeatedCount = miniBosses.filter(b => b.defeated).length;
  const allDefeated = total > 0 && defeatedCount === total;

  const createGoal = (rawName: string) => {
    const name = rawName.trim() || 'My Goal';
    const next: Goal = { name, monsterName: localMonsterName(name), miniBosses: [] };
    setGoal(next);
    setActiveIndex(0);
    persist(next, 0);

    // The AI name, if one ever resolves, replaces the local one in place. A
    // slow or failed call must never block the board.
    void aiMonsterName(name).then(aiName => {
      if (!aiName) return;
      setGoal(current => {
        if (!current) return current;
        const patched = { ...current, monsterName: aiName };
        persist(patched, 0);
        return patched;
      });
    });
  };

  const addBoss = (rawName: string) => {
    const goalText = rawName.trim();
    if (!goalText || !goal) return;

    const id = uid('b');
    const list = [...goal.miniBosses];
    // New sub-bosses are inserted mid-chain, right after the active one — never
    // as a branch.
    const insertAt = Math.min(list.length, safeIndex + 1);
    list.splice(insertAt, 0, {
      id,
      name: localMonsterName(goalText),
      goalText,
      maxHp: MAX_HP,
      hp: MAX_HP,
      defeated: false,
      tasks: [],
    });

    const nextGoal = { ...goal, miniBosses: list };
    const nextIndex = list.length === 1 ? 0 : safeIndex;
    setGoal(nextGoal);
    setActiveIndex(nextIndex);
    setAddingBoss(false);
    persist(nextGoal, nextIndex);

    void aiMonsterName(goalText).then(aiName => {
      if (!aiName) return;
      setGoal(current => {
        if (!current) return current;
        const patched = {
          ...current,
          miniBosses: current.miniBosses.map(b => (b.id === id ? { ...b, name: aiName } : b)),
        };
        persist(patched, nextIndex);
        return patched;
      });
    });
  };

  const addTask = (rawText: string) => {
    const text = rawText.trim();
    if (!text || !goal) return;
    const nextGoal: Goal = {
      ...goal,
      miniBosses: goal.miniBosses.map((mb, i) =>
        i === safeIndex ? { ...mb, tasks: [...mb.tasks, { id: uid('t'), text, size: 'milk' as const, done: false }] } : mb,
      ),
    };
    setGoal(nextGoal);
    persist(nextGoal, safeIndex);
  };

  const selectBoss = (index: number) => {
    setActiveIndex(index);
    persist(goal, index);
  };

  /** The core loop: check a task → deploy a Milk → 12 HP off the active boss. */
  const completeTask = (taskId: string) => {
    if (!goal || !activeBoss) return;
    const task = activeBoss.tasks.find(t => t.id === taskId);
    if (!task || task.done) return;

    const newHp = Math.max(0, activeBoss.hp - MILK_DMG);
    const nextGoal: Goal = {
      ...goal,
      miniBosses: goal.miniBosses.map((b, i) =>
        i === safeIndex
          ? {
              ...b,
              hp: newHp,
              defeated: newHp <= 0,
              tasks: b.tasks.map(t => (t.id === taskId ? { ...t, done: true } : t)),
            }
          : b,
      ),
    };

    setGoal(nextGoal);
    persist(nextGoal, safeIndex);

    setAttackFx({ x: GOAL_MONSTER_X, y: toViewBoxY(ACTIVE_BOSS_Y) });
    schedule(() => setAttackFx(null), HIT_PARTICLE_MS);

    if (newHp <= 0) {
      const defeatedBossId = activeBoss.id;
      setDefeatingId(defeatedBossId);
      const nextIdx = nextGoal.miniBosses.findIndex(b => !b.defeated);
      schedule(() => {
        setDefeatingId(null);
        const resolved = nextIdx >= 0 ? nextIdx : safeIndex;
        setActiveIndex(resolved);
        persist(nextGoal, resolved);
      }, DEFEAT_ANIM_MS);
    }
  };

  const progressLabel = useMemo(
    () =>
      total > 0
        ? `${defeatedCount} of ${total} mini-bosses defeated`
        : 'No mini-bosses yet — add one to begin',
    [defeatedCount, total],
  );

  const page: React.CSSProperties = {
    minHeight: '100vh',
    ...PAPER_BACKGROUND,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 20px 60px',
    color: COLORS.ink,
  };

  if (!hydrated) return <div style={page} />;

  if (!goal) {
    return (
      <div style={page}>
        <div style={{ width: '100%', maxWidth: 800, display: 'flex', justifyContent: 'flex-end' }}>
          <AccountBar />
        </div>
        <CreateGoalScreen onCreate={createGoal} />
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={{ width: '100%', maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <AccountBar />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 24 }}>{goal.name}</div>
            <div style={{ fontSize: 13, color: COLORS.mutedText, marginTop: 1 }}>{progressLabel}</div>
          </div>
          <button
            onClick={() => setAddingBoss(true)}
            style={{
              background: COLORS.surface,
              border: `2px solid ${COLORS.ink}`,
              color: COLORS.ink,
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            + New Sub-Boss
          </button>
        </div>

        <BoardScaler>
          <BattleBoard
            monsterName={goal.monsterName}
            miniBosses={miniBosses}
            activeIndex={safeIndex}
            defeatingId={defeatingId}
            allDefeated={allDefeated}
            attackFx={attackFx}
            hoverBossId={hoverBossId}
            onHoverBoss={setHoverBossId}
            onSelectBoss={selectBoss}
            onAddBoss={() => setAddingBoss(true)}
          />
        </BoardScaler>

        {addingBoss && <AddBossForm onAdd={addBoss} />}

        {activeBoss && total > 0 && <AddTaskBar onAdd={addTask} />}

        {activeBoss && <TaskQueue tasks={activeBoss.tasks} onComplete={completeTask} />}

        {allDefeated && (
          <div
            style={{
              textAlign: 'center',
              background: COLORS.successGreen,
              border: `2px solid ${COLORS.ink}`,
              borderRadius: 18,
              padding: 22,
              fontFamily: DISPLAY_FONT,
              fontWeight: 700,
              fontSize: 19,
            }}
          >
            {goal.monsterName} has been fully defeated! Goal complete.
          </div>
        )}
      </div>
    </div>
  );
};
