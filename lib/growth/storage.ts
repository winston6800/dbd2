import type { Group, GroupMember, UserState, FollowedPerson, Kudos } from './types';
import { DEFAULT_HEATMAP_THEME_ID } from './themes';

/**
 * Every key is scoped per signed-in user, the same pattern as
 * `lib/monster/storage.ts` used for the board: switching accounts on a shared
 * device must not leak one person's streaks, groups, or kudos into another's.
 * This is still device-local — moving it to Supabase is the natural next step
 * now that every session is authenticated.
 */
function scopedKey(base: string, userId: string | null | undefined): string {
  return userId ? `${base}:${userId}` : base;
}

const STATE_KEY = 'dbd_state_v1';
const GROUPS_KEY = 'dbd_groups_v2';
const FOLLOWING_KEY = 'dbd_following_v1';
const DISPLAY_NAME_KEY = 'dbd_display_name';
const KUDOS_KEY = 'dbd_kudos_v1';
const DISCOVERY_LIST_KEY = 'dbd_discovery_list_v1';

type UserId = string | null | undefined;

export function getDisplayName(userId: UserId): string {
  return localStorage.getItem(scopedKey(DISPLAY_NAME_KEY, userId)) || 'You';
}

export function setDisplayName(userId: UserId, name: string): void {
  localStorage.setItem(scopedKey(DISPLAY_NAME_KEY, userId), name.trim() || 'You');
}

export function getDefaultUserState(): UserState {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  return {
    defaultKpi: 'Unique Visitors',
    websiteUrl: '',
    growthObjective: 'INCREASE DAILY UNIQUE VISITORS',
    heatmapTheme: DEFAULT_HEATMAP_THEME_ID,
    streak: 0,
    minThreshold: 100,
    history: [],
    growthDates: [yesterday],
    dailyUvs: { [yesterday]: 5 },
    dailyGrowthActions: { [yesterday]: 5 },
    dailyInfrastructureFocus: { [yesterday]: false },
    dailyShipped: { [yesterday]: true },
    stats: {
      avgUvPerDay: 4,
      conversionResilience: 4.2,
      morningShipments: 12,
      totalUniqueVisitors: 24,
      totalChurnedLeads: 890,
    },
    achievements: [
      { id: 'survival-3', title: 'Survival Instinct', description: 'Maintain growth activity for 3 consecutive days', icon: '🩸', unlocked: false, progress: 0, target: 3, category: 'SURVIVAL' },
      { id: 'survival-7', title: 'Default Alive', description: 'Maintain growth activity for 7 consecutive days', icon: '🔥', unlocked: false, progress: 0, target: 7, category: 'SURVIVAL' },
      { id: 'uv-10k', title: 'The Network Effect', description: 'Log 10,000 total loops', icon: '📈', unlocked: false, progress: 24, target: 10000, category: 'VOLUME' },
      { id: 'morning-30', title: 'First Mover', description: 'Log 30 growth logs before 9AM', icon: '☀️', unlocked: false, progress: 12, target: 30, category: 'CONSISTENCY' },
    ],
    currentUvs: 0,
    isOnMaintenance: false,
  };
}

export function getUserState(userId: UserId): UserState {
  const raw = localStorage.getItem(scopedKey(STATE_KEY, userId));
  if (!raw) return getDefaultUserState();
  try {
    return JSON.parse(raw);
  } catch {
    return getDefaultUserState();
  }
}

export function saveUserState(userId: UserId, state: UserState): void {
  localStorage.setItem(scopedKey(STATE_KEY, userId), JSON.stringify(state));
}

export function getGroups(userId: UserId): Record<string, Group> {
  const raw = localStorage.getItem(scopedKey(GROUPS_KEY, userId));
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveGroups(userId: UserId, groups: Record<string, Group>): void {
  localStorage.setItem(scopedKey(GROUPS_KEY, userId), JSON.stringify(groups));
}

export function createGroup(userId: UserId, name: string, creatorName: string, creatorState: UserState): Group {
  const id = 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  const memberId = 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  const group: Group = {
    id,
    name,
    members: [{ id: memberId, name: creatorName, userState: creatorState }],
    createdAt: new Date().toISOString(),
  };
  const groups = getGroups(userId);
  groups[id] = group;
  saveGroups(userId, groups);
  return group;
}

export function updateGroup(userId: UserId, id: string, updates: Partial<Group>): void {
  const groups = getGroups(userId);
  if (groups[id]) {
    groups[id] = { ...groups[id], ...updates };
    saveGroups(userId, groups);
  }
}

export function deleteGroup(userId: UserId, id: string): void {
  const groups = getGroups(userId);
  delete groups[id];
  saveGroups(userId, groups);
}

/** Encode group for shareable URL - base64 JSON */
export function encodeGroupForUrl(group: Group): string {
  const payload = { id: group.id, name: group.name, members: group.members };
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

/** Decode group from URL param */
export function decodeGroupFromUrl(code: string): { id: string; name: string; members: GroupMember[] } | null {
  try {
    const decoded = decodeURIComponent(atob(code.trim()));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/** Build shareable join link */
export function getJoinLink(group: Group): string {
  const code = encodeGroupForUrl(group);
  return `${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}?join=${code}`;
}

// --- Following ---

export function getFollowing(userId: UserId): Record<string, FollowedPerson> {
  const raw = localStorage.getItem(scopedKey(FOLLOWING_KEY, userId));
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveFollowing(userId: UserId, following: Record<string, FollowedPerson>): void {
  localStorage.setItem(scopedKey(FOLLOWING_KEY, userId), JSON.stringify(following));
}

export function addFollowed(userId: UserId, person: { id: string; name: string; userState: UserState }): void {
  const following = getFollowing(userId);
  following[person.id] = {
    ...person,
    followedAt: new Date().toISOString(),
  };
  saveFollowing(userId, following);
}

export function updateFollowed(userId: UserId, id: string, userState: UserState): void {
  const following = getFollowing(userId);
  if (following[id]) {
    following[id] = { ...following[id], userState };
    saveFollowing(userId, following);
  }
}

export function removeFollowed(userId: UserId, id: string): void {
  const following = getFollowing(userId);
  delete following[id];
  saveFollowing(userId, following);
}

/** Encode profile for "follow me" link */
export function encodeFollowProfileForUrl(name: string, userState: UserState): string {
  const payload = { name, userState };
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

/** Decode profile from follow URL param */
export function decodeFollowProfileFromUrl(code: string): { name: string; userState: UserState } | null {
  try {
    const decoded = decodeURIComponent(atob(code.trim()));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/** Build "follow me" shareable link */
export function getFollowMeLink(name: string, userState: UserState): string {
  const code = encodeFollowProfileForUrl(name, userState);
  return `${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}?follow=${code}`;
}

// --- Kudos ---

export function getKudos(userId: UserId): Kudos[] {
  const raw = localStorage.getItem(scopedKey(KUDOS_KEY, userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveKudos(userId: UserId, kudos: Kudos[]): void {
  localStorage.setItem(scopedKey(KUDOS_KEY, userId), JSON.stringify(kudos));
}

export function addKudos(userId: UserId, activityKey: string, emoji: Kudos['emoji']): void {
  const kudos = getKudos(userId).filter(k => k.activityKey !== activityKey);
  kudos.push({ activityKey, emoji });
  saveKudos(userId, kudos);
}

export function removeKudos(userId: UserId, activityKey: string): void {
  saveKudos(userId, getKudos(userId).filter(k => k.activityKey !== activityKey));
}

export function hasKudos(userId: UserId, activityKey: string): Kudos | undefined {
  return getKudos(userId).find(k => k.activityKey === activityKey);
}

// --- Discovery ---

export function getDiscoveryList(userId: UserId): string[] {
  const raw = localStorage.getItem(scopedKey(DISCOVERY_LIST_KEY, userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setDiscoveryList(userId: UserId, links: string[]): void {
  localStorage.setItem(scopedKey(DISCOVERY_LIST_KEY, userId), JSON.stringify(links));
}

export function addToDiscoveryList(userId: UserId, link: string): void {
  const list = getDiscoveryList(userId);
  if (!list.includes(link)) {
    list.push(link);
    setDiscoveryList(userId, list);
  }
}
