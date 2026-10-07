// The planner's data, as stored. Every entity has a stable string id.
import type { ISODate } from './dates';

export const CATEGORIES = ['hobby', 'health', 'career', 'finances', 'relationship'] as const;
export type Category = (typeof CATEGORIES)[number];

export const MAX_ACTIVE_PRIORITIES = 3;

export interface Settings {
  /** null until onboarding asks for it. */
  birthday: ISODate | null;
  /** IANA zone the daily reminder is timed in, e.g. 'America/New_York'. */
  timeZone: string;
  notificationsOn: boolean;
  /** 'HH:MM', 24-hour. */
  notificationTime: string;
  closedQuarterKeys: string[];
}

export interface Cookie {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

export type PriorityStatus = 'active' | 'paused';

export interface Priority {
  id: string;
  title: string;
  category: Category | null;
  why: string;
  progress: string;
  status: PriorityStatus;
  /** The change agreed at the last quarter review, when it was "adjust". */
  adjust: string | null;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  priorityId: string | null;
  createdAt: number;
}

export interface Activity {
  id: string;
  projectId: string;
  date: ISODate;
  text: string;
  createdAt: number;
}

export interface Idea {
  id: string;
  text: string;
  date: ISODate;
  createdAt: number;
}

export type Decision = 'continue' | 'adjust' | 'retire';

export interface PriorityDecision {
  priorityId: string;
  title: string;
  decision: Decision;
  outcome: string;
  change: string;
}

export interface QuarterReview {
  id: string;
  quarterKey: string;
  date: ISODate;
  decisions: PriorityDecision[];
  createdAt: number;
}

export interface PlannerState {
  settings: Settings;
  cookies: Cookie[];
  priorities: Priority[];
  projects: Project[];
  activity: Activity[];
  backburner: Idea[];
  quarterReviews: QuarterReview[];
}

export const DEFAULT_NOTIFICATION_TIME = '08:30';

export function defaultSettings(timeZone: string): Settings {
  return { birthday: null, timeZone, notificationsOn: false, notificationTime: DEFAULT_NOTIFICATION_TIME, closedQuarterKeys: [] };
}

export function emptyState(timeZone = 'UTC'): PlannerState {
  return { settings: defaultSettings(timeZone), cookies: [], priorities: [], projects: [], activity: [], backburner: [], quarterReviews: [] };
}

/** What a command needs from the outside world, injected so rules stay testable. */
export interface CommandContext {
  now: Date;
  newId: () => string;
}

const byCreated = <T extends { createdAt: number; id: string }>(a: T, b: T) => a.createdAt - b.createdAt || a.id.localeCompare(b.id);

/** Collections in display order (oldest first). */
export function ordered<T extends { createdAt: number; id: string }>(items: readonly T[]): T[] {
  return [...items].sort(byCreated);
}
