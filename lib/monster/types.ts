export interface Task {
  id: string;
  text: string;
  size: 'milk';
  done: boolean;
}

export interface MiniBoss {
  id: string;
  /** Generated monster name, e.g. "Mileagoloth the Endless". */
  name: string;
  /** What the user actually typed — shown in the hover tooltip. */
  goalText: string;
  maxHp: number;
  hp: number;
  defeated: boolean;
  tasks: Task[];
}

export interface Goal {
  name: string;
  monsterName: string;
  miniBosses: MiniBoss[];
}

/** The slice of app state that gets persisted. */
export interface PersistedState {
  goal: Goal | null;
  activeIndex: number;
}

/** HP removed from the active mini-boss per completed task. */
export const MILK_DMG = 12;
export const MAX_HP = 100;
