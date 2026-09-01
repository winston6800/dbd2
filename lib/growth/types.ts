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
  // Minutes logged by completed Pomodoro sessions (components/GrowthProtocol/
  // PomodoroTimer.tsx), keyed by date. A completed session also marks that
  // date active in growthDates, so focus time counts toward the streak the
  // same way a logged loop does.
  dailyFocusMinutes?: Record<string, number>;
  journalEntries?: Record<string, string>; // Self-respect journal, keyed by date
  // Self-reported usage, keyed by date. Each tap of a category's icon on
  // Command logs one unit — an hour for youtube/twitch/x, a use for porn —
  // see components/GrowthProtocol/ContaminationTracker.tsx. Replaces the
  // browser-extension-based automatic tracker (extension/, paused for now).
  screenTimeLog?: Record<string, { youtube: number; twitch: number; x: number; porn: number }>;
  // Skills the user has — the "Value" card on Feed. What you can point to
  // that you built yourself, independent of anyone's permission to hire you.
  skills?: string[];
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
  // Shared list of activities the group is doing together, e.g. "Ship
  // together every Friday". Rides along in the join link like members do —
  // see encodeGroupForUrl/decodeGroupFromUrl.
  activities?: string[];
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
