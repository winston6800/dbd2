export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
  category: 'CONSISTENCY' | 'VOLUME' | 'MOMENTUM' | 'SURVIVAL';
}

export interface UserStats {
  avgUvPerDay: number;
  conversionResilience: number;
  morningShipments: number;
  totalUniqueVisitors: number;
  totalChurnedLeads: number;
}

export interface UserState {
  defaultKpi: string; // "Unique Visitors"
  websiteUrl?: string; // User's project website
  growthObjective?: string; // Customizable growth objective text
  heatmapTheme?: string; // Color theme id (lib/growth/themes.ts) representing the objective
  streak: number;
  history: { date: string; value: number }[];
  growthDates: string[];
  dailyUvs: Record<string, number>;
  dailyGrowthActions: Record<string, number>;
  dailyInfrastructureFocus: Record<string, boolean>;
  dailyShipped: Record<string, boolean>; // Honor code checkmarks
  dailyShipNote?: Record<string, string>; // Optional "what did you ship" note
  journalEntries?: Record<string, string>; // Self-respect journal, keyed by date
  // Self-reported usage, keyed by date. Each tap of a category's icon on
  // Command logs one unit — an hour for youtube/twitch/x, a use for porn —
  // see components/GrowthProtocol/ContaminationTracker.tsx. Replaces the
  // browser-extension-based automatic tracker (extension/, paused for now).
  screenTimeLog?: Record<string, { youtube: number; twitch: number; x: number; porn: number }>;
  stats: UserStats;
  achievements: Achievement[];
  currentUvs: number;
  isOnMaintenance: boolean;
  minThreshold: number;
}

export type ActivityType = 'ship' | 'loops' | 'break';

export interface FeedActivity {
  id: string;
  personId: string;
  personName: string;
  type: ActivityType;
  date: string;
  value?: number; // loops count
  note?: string; // what did you ship
}

export type ReactionEmoji = '🔥' | '🚀' | '💪' | '👏';

export interface Kudos {
  activityKey: string; // personId_date
  emoji: ReactionEmoji;
}

export interface GroupMember {
  id: string;
  name: string;
  userState: UserState;
}

export interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  createdAt: string;
}

export interface FollowedPerson {
  id: string;
  name: string;
  userState: UserState;
  followedAt: string;
}

export interface DiscoverablePerson {
  id: string;
  name: string;
  userState: UserState;
  source: 'group' | 'community';
}

export enum AppScreen {
  BASE = 'BASE',
  FEED = 'FEED',
  GROUPS = 'GROUPS',
  DISCOVER = 'DISCOVER',
  JOURNAL = 'JOURNAL',
  PROFILE = 'PROFILE',
}
