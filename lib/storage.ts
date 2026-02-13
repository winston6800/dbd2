import type { Group, GroupMember, UserState, FollowedPerson, Kudos, Challenge } from '../types';

const STATE_KEY = 'deadbydefault_state_v1';
const GROUPS_KEY = 'dbd_groups_v2';
const FOLLOWING_KEY = 'dbd_following_v1';
const DISPLAY_NAME_KEY = 'dbd_display_name';
const KUDOS_KEY = 'dbd_kudos_v1';
const CHALLENGES_KEY = 'dbd_challenges_v1';
const DISCOVERY_LIST_KEY = 'dbd_discovery_list_v1';

export function getDisplayName(): string {
  return localStorage.getItem(DISPLAY_NAME_KEY) || 'You';
}

export function setDisplayName(name: string): void {
  localStorage.setItem(DISPLAY_NAME_KEY, name.trim() || 'You');
}

export function getDefaultUserState(): UserState {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  return {
    defaultKpi: "Unique Visitors",
    websiteUrl: "",
    growthObjective: "INCREASE DAILY UNIQUE VISITORS",
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
      totalChurnedLeads: 890
    },
    achievements: [
      { id: 'survival-3', title: 'Survival Instinct', description: 'Maintain growth activity for 3 consecutive days', icon: '🩸', unlocked: false, progress: 0, target: 3, category: 'SURVIVAL' },
      { id: 'survival-7', title: 'Default Alive', description: 'Maintain growth activity for 7 consecutive days', icon: '🔥', unlocked: false, progress: 0, target: 7, category: 'SURVIVAL' },
      { id: 'uv-10k', title: 'The Network Effect', description: 'Log 10,000 total loops', icon: '📈', unlocked: false, progress: 24, target: 10000, category: 'VOLUME' },
      { id: 'morning-30', title: 'First Mover', description: 'Log 30 growth logs before 9AM', icon: '☀️', unlocked: false, progress: 12, target: 30, category: 'CONSISTENCY' },
    ],
    currentUvs: 0,
    isOnMaintenance: false
  };
}

export function getUserState(): UserState {
  const raw = localStorage.getItem(STATE_KEY);
  if (!raw) return getDefaultUserState();
  try {
    return JSON.parse(raw);
  } catch {
    return getDefaultUserState();
  }
}

export function saveUserState(state: UserState): void {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export function getGroups(): Record<string, Group> {
  const raw = localStorage.getItem(GROUPS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveGroups(groups: Record<string, Group>): void {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export function createGroup(name: string, creatorName: string, creatorState: UserState): Group {
  const id = 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  const memberId = 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  const group: Group = {
    id,
    name,
    members: [{ id: memberId, name: creatorName, userState: creatorState }],
    createdAt: new Date().toISOString()
  };
  const groups = getGroups();
  groups[id] = group;
  saveGroups(groups);
  return group;
}

export function updateGroup(id: string, updates: Partial<Group>): void {
  const groups = getGroups();
  if (groups[id]) {
    groups[id] = { ...groups[id], ...updates };
    saveGroups(groups);
  }
}

export function deleteGroup(id: string): void {
  const groups = getGroups();
  delete groups[id];
  saveGroups(groups);
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

export function getFollowing(): Record<string, FollowedPerson> {
  const raw = localStorage.getItem(FOLLOWING_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveFollowing(following: Record<string, FollowedPerson>): void {
  localStorage.setItem(FOLLOWING_KEY, JSON.stringify(following));
}

export function addFollowed(person: { id: string; name: string; userState: UserState }): void {
  const following = getFollowing();
  following[person.id] = {
    ...person,
    followedAt: new Date().toISOString(),
  };
  saveFollowing(following);
}

export function updateFollowed(id: string, userState: UserState): void {
  const following = getFollowing();
  if (following[id]) {
    following[id] = { ...following[id], userState };
    saveFollowing(following);
  }
}

export function removeFollowed(id: string): void {
  const following = getFollowing();
  delete following[id];
  saveFollowing(following);
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

export function getKudos(): Kudos[] {
  const raw = localStorage.getItem(KUDOS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveKudos(kudos: Kudos[]): void {
  localStorage.setItem(KUDOS_KEY, JSON.stringify(kudos));
}

export function addKudos(activityKey: string, emoji: Kudos['emoji']): void {
  const kudos = getKudos().filter(k => k.activityKey !== activityKey);
  kudos.push({ activityKey, emoji });
  saveKudos(kudos);
}

export function removeKudos(activityKey: string): void {
  saveKudos(getKudos().filter(k => k.activityKey !== activityKey));
}

export function hasKudos(activityKey: string): Kudos | undefined {
  return getKudos().find(k => k.activityKey === activityKey);
}

// --- Challenges ---

function getWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toLocaleDateString('en-CA'),
    end: sunday.toLocaleDateString('en-CA'),
  };
}

export function getDefaultChallenges(): Challenge[] {
  const { start, end } = getWeekBounds();
  return [
    { id: 'ch_weekly_ship', name: 'Ship 5 days this week', type: 'weekly_ship', target: 5, startDate: start, endDate: end },
    { id: 'ch_weekly_loops', name: 'Log 50 loops this week', type: 'weekly_loops', target: 50, startDate: start, endDate: end },
    { id: 'ch_streak_7', name: '7-day streak', type: 'streak', target: 7, startDate: start, endDate: end },
  ];
}

export function getChallenges(): Challenge[] {
  const raw = localStorage.getItem(CHALLENGES_KEY);
  if (!raw) return getDefaultChallenges();
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getDefaultChallenges();
  } catch {
    return getDefaultChallenges();
  }
}

export function saveChallenges(challenges: Challenge[]): void {
  localStorage.setItem(CHALLENGES_KEY, JSON.stringify(challenges));
}

/** Compute progress for a challenge given user state */
export function getChallengeProgress(
  challenge: Challenge,
  userState: import('../types').UserState
): number {
  const { startDate, endDate, type } = challenge;
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (type === 'streak') {
    return userState.streak;
  }

  if (type === 'weekly_ship') {
    let count = 0;
    const d = new Date(start);
    while (d <= end) {
      const dateStr = d.toLocaleDateString('en-CA');
      if (userState.dailyShipped[dateStr]) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  }

  if (type === 'weekly_loops') {
    let total = 0;
    const d = new Date(start);
    while (d <= end) {
      const dateStr = d.toLocaleDateString('en-CA');
      total += userState.dailyUvs[dateStr] || 0;
      d.setDate(d.getDate() + 1);
    }
    return total;
  }

  return 0;
}

// --- Discovery ---

export function getDiscoveryList(): string[] {
  const raw = localStorage.getItem(DISCOVERY_LIST_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setDiscoveryList(links: string[]): void {
  localStorage.setItem(DISCOVERY_LIST_KEY, JSON.stringify(links));
}

export function addToDiscoveryList(link: string): void {
  const list = getDiscoveryList();
  if (!list.includes(link)) {
    list.push(link);
    setDiscoveryList(list);
  }
}
