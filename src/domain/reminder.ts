// The daily reminder: what it says, and whether it is due. Shared by the app
// and the server that sends it, so the wording is defined only here.
import type { ISODate } from './dates';
import { openCookies } from './cookies';
import type { Cookie, Settings } from './model';

export interface ReminderMessage {
  title: string;
  body: string;
}

export function reminderMessage(cookies: readonly Cookie[]): ReminderMessage {
  const open = openCookies(cookies);
  const first = open[0];
  if (!first) return { title: 'No deathcookies today', body: 'Plate is clean. Nothing urgent to eat.' };
  const n = open.length;
  return { title: `${n} deathcookie${n === 1 ? '' : 's'} to eat`, body: `Start with: ${first.text}` };
}

export function isTimeOfDay(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

export function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The wall-clock date and minute-of-day at `now` in a time zone. */
export function localClock(now: Date, timeZone: string): { date: ISODate; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: isTimeZone(timeZone) ? timeZone : 'UTC',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

/**
 * How late a reminder may still go out. The scheduler (GitHub Actions) can run
 * late or skip a run, so this is generous; later than this, that day's
 * reminder is skipped rather than arriving at night.
 */
export const REMINDER_GRACE_MINUTES = 180;

/**
 * The local date to send today's reminder for, or null when nothing is due.
 * `lastSentDate` is the local date of the last reminder sent.
 */
export function reminderDueDate(settings: Pick<Settings, 'notificationsOn' | 'notificationTime' | 'timeZone'>, now: Date, lastSentDate: ISODate | null): ISODate | null {
  if (!settings.notificationsOn || !isTimeOfDay(settings.notificationTime)) return null;
  const { date, minutes } = localClock(now, settings.timeZone);
  if (date === lastSentDate) return null;
  const [h, m] = settings.notificationTime.split(':').map(Number);
  const late = minutes - ((h ?? 0) * 60 + (m ?? 0));
  return late >= 0 && late < REMINDER_GRACE_MINUTES ? date : null;
}
