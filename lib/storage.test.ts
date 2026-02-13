import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDefaultUserState,
  getUserState,
  saveUserState,
  getGroups,
  saveGroups,
  createGroup,
  updateGroup,
  encodeGroupForUrl,
  decodeGroupFromUrl,
  getJoinLink,
  getDisplayName,
  setDisplayName,
} from './storage';

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

describe('storage', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    Object.defineProperty(global, 'localStorage', { value: mockLocalStorage, writable: true });
  });

  describe('getDefaultUserState', () => {
    it('returns valid user state with required fields', () => {
      const state = getDefaultUserState();
      expect(state).toHaveProperty('streak', 0);
      expect(state).toHaveProperty('growthDates');
      expect(state).toHaveProperty('dailyUvs');
      expect(state).toHaveProperty('dailyShipped');
      expect(state).toHaveProperty('stats');
      expect(state.stats).toHaveProperty('totalUniqueVisitors');
      expect(state).toHaveProperty('achievements');
      expect(Array.isArray(state.achievements)).toBe(true);
    });
  });

  describe('getUserState / saveUserState', () => {
    it('returns default state when nothing saved', () => {
      const state = getUserState();
      expect(state.streak).toBe(0);
    });

    it('returns saved state after saveUserState', () => {
      const custom = getDefaultUserState();
      custom.streak = 5;
      saveUserState(custom);
      expect(getUserState().streak).toBe(5);
    });
  });

  describe('getDisplayName / setDisplayName', () => {
    it('returns "You" when not set', () => {
      expect(getDisplayName()).toBe('You');
    });

    it('returns saved name after setDisplayName', () => {
      setDisplayName('Alex');
      expect(getDisplayName()).toBe('Alex');
    });
  });

  describe('encodeGroupForUrl / decodeGroupFromUrl', () => {
    it('round-trips group data', () => {
      const group = {
        id: 'g_123',
        name: 'Test Squad',
        members: [{
          id: 'm_1',
          name: 'Alice',
          userState: getDefaultUserState(),
        }],
        createdAt: new Date().toISOString(),
      };
      const code = encodeGroupForUrl(group);
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);

      const decoded = decodeGroupFromUrl(code);
      expect(decoded).not.toBeNull();
      expect(decoded!.id).toBe(group.id);
      expect(decoded!.name).toBe(group.name);
      expect(decoded!.members).toHaveLength(1);
      expect(decoded!.members[0].name).toBe('Alice');
    });

    it('returns null for invalid code', () => {
      expect(decodeGroupFromUrl('not-valid-base64!!!')).toBeNull();
      expect(decodeGroupFromUrl('')).toBeNull();
    });
  });

  describe('createGroup / getGroups', () => {
    it('creates group and persists to storage', () => {
      const state = getDefaultUserState();
      const group = createGroup('My Squad', 'You', state);
      expect(group.name).toBe('My Squad');
      expect(group.members).toHaveLength(1);
      expect(group.members[0].name).toBe('You');

      const groups = getGroups();
      expect(groups[group.id]).toBeDefined();
      expect(groups[group.id].name).toBe('My Squad');
    });
  });

  describe('updateGroup', () => {
    it('updates group members', () => {
      const state = getDefaultUserState();
      const group = createGroup('Squad', 'A', state);
      const newMember = { id: 'm_2', name: 'B', userState: state };
      updateGroup(group.id, { members: [...group.members, newMember] });

      const groups = getGroups();
      expect(groups[group.id].members).toHaveLength(2);
    });
  });

  describe('getJoinLink', () => {
    it('returns URL with join param', () => {
      const group = {
        id: 'g_1',
        name: 'Test',
        members: [],
        createdAt: new Date().toISOString(),
      };
      const link = getJoinLink(group);
      expect(link).toContain('?join=');
      expect(link.length).toBeGreaterThan(10);
    });
  });
});
