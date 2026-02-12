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
  stats: UserStats;
  achievements: Achievement[];
  currentUvs: number;
  isOnMaintenance: boolean;
  minThreshold: number;
}

export enum AppScreen {
  BASE = 'BASE',
  DASHBOARD = 'DASHBOARD',
  ACHIEVEMENTS = 'ACHIEVEMENTS',
  PROFILE = 'PROFILE'
}