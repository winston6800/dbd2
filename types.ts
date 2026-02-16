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
  profileBio?: string; // Short bio for profile
  profilePhoto?: string; // Data URL or image URL for avatar
  streak: number;
  history: { date: string; value: number }[];
  growthDates: string[];
  dailyUvs: Record<string, number>;
  dailyGrowthActions: Record<string, number>;
  dailyInfrastructureFocus: Record<string, boolean>;
  dailyShipped: Record<string, boolean>; // Track honor code checkmarks
  dailyShipNote?: Record<string, string>; // Optional "what did you ship" note
  dailyInputPost?: Record<string, string>; // Post about today's inputs
  dailyPostTime?: Record<string, string>; // ISO timestamp when post was last saved
  dailyHours?: Record<string, number>; // Hours logged per day (from session timer)
  dailyFirstNote?: Record<string, string>; // First thing logged that day (for heatmap tooltip)
  stats: UserStats;
  achievements: Achievement[];
  currentUvs: number;
  isOnMaintenance: boolean;
  minThreshold: number;
}

export type ActivityType = 'ship' | 'loops' | 'break' | 'post';

export interface FeedActivity {
  id: string;
  personId: string;
  personName: string;
  type: ActivityType;
  date: string;
  time?: string; // ISO timestamp when posted (for post type)
  value?: number; // loops count
  note?: string; // what did you ship
  hours?: number; // session duration for post
}

export interface ActivityComment {
  id: string;
  author: string;
  text: string;
  timestamp: string; // ISO
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
  RECORD = 'RECORD',
  GROUPS = 'GROUPS',
  DISCOVER = 'DISCOVER',
  YOU = 'YOU'
}