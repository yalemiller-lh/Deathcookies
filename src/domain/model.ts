// The planner's data, as stored. Every entity has a stable string id.
import type { ISODate } from './dates';

export interface Settings {
  /** null until onboarding asks for it. */
  birthday: ISODate | null;
  /** IANA zone the daily reminder is timed in, e.g. 'America/New_York'. */
  timeZone: string;
  notificationsOn: boolean;
  /** 'HH:MM', 24-hour. */
  notificationTime: string;
  /** Local date the last daily reminder went out. Written by the reminder sender, never by the app. */
  lastReminderDate: ISODate | null;
}

export interface Cookie {
  id: string;
  text: string;
  done: boolean;
  /** Times are milliseconds since 1970 (Date.getTime()). */
  createdAt: number;
  /** When it was ticked off; null while open. */
  completedAt: number | null;
  /** When "Clear the done ones" took it off the list; it is kept, not deleted. */
  clearedAt: number | null;
}

/** Something to do every week. Its tick clears itself when a new week starts. */
export interface Weekly {
  id: string;
  text: string;
  /** The Monday of the week it was ticked; it counts as done only during that week. */
  doneWeek: ISODate | null;
  createdAt: number;
}

export const REJECTION_TOTAL = 100;

/** One completed Rejection Therapy card. */
export interface Rejection {
  id: string;
  /** Card number, 1–100. */
  n: number;
  /** Local date it was done. */
  date: ISODate;
  createdAt: number;
}

/** A quote the person kept (from a screenshot or typed in). */
export interface SavedQuote {
  id: string;
  text: string;
  /** Who said it; empty when unknown. */
  by: string;
  createdAt: number;
}

export interface PlannerState {
  settings: Settings;
  cookies: Cookie[];
  weeklies: Weekly[];
  rejections: Rejection[];
  quotes: SavedQuote[];
}

export const DEFAULT_NOTIFICATION_TIME = '08:30';

export function defaultSettings(timeZone: string): Settings {
  return { birthday: null, timeZone, notificationsOn: false, notificationTime: DEFAULT_NOTIFICATION_TIME, lastReminderDate: null };
}

export function emptyState(timeZone = 'UTC'): PlannerState {
  return { settings: defaultSettings(timeZone), cookies: [], weeklies: [], rejections: [], quotes: [] };
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
