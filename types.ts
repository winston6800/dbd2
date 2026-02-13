export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

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
  growthObjective?: string; // New: Customizable growth objective text
  streak: number;
  history: { date: string; value: number }[];
  growthDates: string[];
  dailyUvs: Record<string, number>;
  dailyGrowthActions: Record<string, number>;
  dailyInfrastructureFocus: Record<string, boolean>;
  dailyShipped: Record<string, boolean>; // Track honor code checkmarks
  dailyShipNote?: Record<string, string>; // Optional "what did you ship" note
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

export interface Challenge {
  id: string;
  name: string;
  type: 'weekly_ship' | 'weekly_loops' | 'streak';
  target: number;
  startDate: string;
  endDate: string;
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
  HOME = 'HOME',
  GROUPS = 'GROUPS',
  DISCOVER = 'DISCOVER',
  YOU = 'YOU'
}