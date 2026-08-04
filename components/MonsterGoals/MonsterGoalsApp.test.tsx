import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mocked so the test never constructs a real Supabase client.
vi.mock('../../lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'player@example.com' },
    subscription: null,
    signOut: vi.fn(),
  }),
}));

// No network in tests: the cloud read fails, so the board falls back to
// localStorage — the same degraded path a user gets when they are offline.
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'offline' } }) }),
      }),
      upsert: async () => ({ error: { message: 'offline' } }),
      insert: async () => ({ error: null }),
    }),
    rpc: async () => ({ data: null, error: { message: 'offline' } }),
  },
}));

import { MonsterGoalsApp } from './MonsterGoalsApp';

/** Board hydration is async now, so every test waits for the first paint. */
async function mountApp() {
  const utils = render(<MonsterGoalsApp />);
  await screen.findByText(/Name your goal|No mini-bosses yet|mini-bosses defeated/);
  return utils;
}

function summonGoal(name = 'Learn Spanish') {
  fireEvent.change(screen.getByPlaceholderText('Goal, e.g. Learn Spanish'), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'Summon Monster' }));
}

function addSubBoss(text = 'Finish unit one') {
  fireEvent.click(screen.getByRole('button', { name: '+ New Sub-Boss' }));
  fireEvent.change(screen.getByPlaceholderText('Sub-goal, e.g. Run 20 miles a week'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
}

function addTask(text: string) {
  fireEvent.change(screen.getByPlaceholderText('Enter task / target objective...'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: '+ ADD' }));
}

describe('MonsterGoalsApp', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lands new users on the Create Goal screen — no demo seed', async () => {
    await mountApp();
    expect(screen.getByText('Name your goal')).toBeTruthy();
    expect(screen.queryByText(/Run a Marathon/)).toBeNull();
  });

  it('summons a monster and shows the empty board', async () => {
    await mountApp();
    summonGoal();

    expect(screen.getByText('Learn Spanish')).toBeTruthy();
    expect(screen.getByText('No mini-bosses yet — add one to begin')).toBeTruthy();
    // The task bar only appears once there is a boss to fight.
    expect(screen.queryByPlaceholderText('Enter task / target objective...')).toBeNull();
  });

  it('checking a task deploys a Milk and takes 12 HP off the active boss', async () => {
    await mountApp();
    summonGoal();
    addSubBoss();

    expect(screen.getByText('100/100 HP')).toBeTruthy();
    expect(screen.getByText('0 of 1 mini-bosses defeated')).toBeTruthy();

    addTask('Learn 20 verbs');
    expect(screen.getByText('0 deployed · 1 in queue')).toBeTruthy();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Learn 20 verbs' }));

    expect(screen.getByText('88/100 HP')).toBeTruthy();
    expect(screen.getByText('DEPLOYED')).toBeTruthy();
    expect(screen.getByText('1 deployed · 0 in queue')).toBeTruthy();
    // The Milk unit is now orbiting, badge and all.
    expect(screen.getByText('MILK')).toBeTruthy();
  });

  it('does not let a deployed task be un-checked', async () => {
    await mountApp();
    summonGoal();
    addSubBoss();
    addTask('One-way trip');

    const box = screen.getByRole('checkbox', { name: 'One-way trip' });
    fireEvent.click(box);
    expect(screen.getByText('88/100 HP')).toBeTruthy();

    fireEvent.click(box);
    expect(screen.getByText('88/100 HP')).toBeTruthy();
  });

  it('sorts undone tasks above deployed ones', async () => {
    await mountApp();
    summonGoal();
    addSubBoss();
    addTask('First');
    addTask('Second');

    fireEvent.click(screen.getByRole('checkbox', { name: 'First' }));

    const rows = document.querySelectorAll('.mg-scroll .mg-row');
    expect(within(rows[0] as HTMLElement).getByText('IN QUEUE')).toBeTruthy();
    expect(within(rows[1] as HTMLElement).getByText('DEPLOYED')).toBeTruthy();
  });

  it('defeats a boss at 0 HP and declares the goal complete', async () => {
    await mountApp();
    vi.useFakeTimers();
    summonGoal();
    addSubBoss('The only boss');

    // 100 HP at 12 HP a task — the ninth task is the killing blow.
    for (let i = 0; i < 9; i++) addTask(`Task ${i}`);
    for (let i = 0; i < 9; i++) {
      fireEvent.click(screen.getByRole('checkbox', { name: `Task ${i}` }));
    }

    expect(screen.getByText('1 of 1 mini-bosses defeated')).toBeTruthy();
    expect(screen.getByText(/has been fully defeated! Goal complete\./)).toBeTruthy();

    // Mid-animation the boss keeps its face: the nine ✓ glyphs on screen are
    // the deployed task rows, not the graveyard marker.
    expect(screen.getAllByText('✓')).toHaveLength(9);

    // The defeat animation runs for 1300ms before the board advances and the
    // boss drops into the graveyard trail as a ✓.
    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(screen.getAllByText('✓')).toHaveLength(10);
  });

  it('keeps edits made during the 1300ms defeat animation', async () => {
    await mountApp();
    vi.useFakeTimers();
    summonGoal('Survive the animation');
    addSubBoss('Doomed boss');

    for (let i = 0; i < 9; i++) addTask(`Task ${i}`);
    for (let i = 0; i < 9; i++) {
      fireEvent.click(screen.getByRole('checkbox', { name: `Task ${i}` }));
    }

    // The board stays interactive while the boss is dying.
    act(() => {
      vi.advanceTimersByTime(400);
    });
    addSubBoss('Added mid-animation');

    act(() => {
      vi.advanceTimersByTime(1300);
    });

    // The deferred write must not clobber the boss added during the animation.
    const saved = JSON.parse(localStorage.getItem('monsterGoalsAppState:test-user') ?? '{}');
    const names = saved.goal.miniBosses.map((b: { goalText: string }) => b.goalText);
    expect(names).toContain('Added mid-animation');
    // …and the board must advance to the surviving boss, not a stale index.
    expect(saved.goal.miniBosses[saved.activeIndex].goalText).toBe('Added mid-animation');
  });

  it('restores a saved board from storage on mount', async () => {
    const { unmount } = await mountApp();
    summonGoal('Ship the thing');
    addSubBoss('Write the docs');
    unmount();

    await mountApp();
    expect(screen.getByText('Ship the thing')).toBeTruthy();
    expect(screen.getByText('0 of 1 mini-bosses defeated')).toBeTruthy();
  });

  it('scopes saved state to the signed-in user', async () => {
    await mountApp();
    summonGoal('Private goal');
    expect(localStorage.getItem('monsterGoalsAppState:test-user')).toContain('Private goal');
    expect(localStorage.getItem('monsterGoalsAppState')).toBeNull();
  });
});
