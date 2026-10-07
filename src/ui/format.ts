// Display text built from dates and domain values.
import { parseISODate, type Quarter, type QuarterProgress } from '../domain/dates';
import type { Activity } from '../domain/model';

const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-US', o);

export const monthDay = (d: Date) => fmt(d, { month: 'long', day: 'numeric' });
export const monthDayYear = (d: Date) => fmt(d, { month: 'long', day: 'numeric', year: 'numeric' });
export const weekdayMonthDay = (d: Date) => fmt(d, { weekday: 'long', month: 'long', day: 'numeric' });
export const quarterRange = (q: Quarter) => `${monthDay(q.start)} – ${monthDay(q.end)}`;

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
export const numeral = (i: number) => ROMAN[i] ?? String(i + 1);

export function weekLine(p: QuarterProgress): string {
  if (p.upcoming) return `Quarter begins in ${plural(Math.ceil(p.daysUntilStart / 7), 'week', 'weeks')}`;
  return `Week ${p.week} of ${p.totalWeeks} · ${p.weeksLeft === 0 ? 'final week' : `${plural(p.weeksLeft, 'week', 'weeks')} left`}`;
}

/** 'THU · 5 km in the rain' */
export const activityLabel = (a: Activity) => `${fmt(parseISODate(a.date), { weekday: 'short' }).toUpperCase()} · ${a.text}`;

/** '08:30' → '8:30 am' */
export function time12(t: string): string {
  const [h = 8, m = 30] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

export const HINTS = {
  titleRequired: 'Give it a title first, even a rough one.',
  afterPromote: 'Pick a category and write down why it matters while it is fresh.',
  removedElsewhere: 'This one was removed on another device.',
  noRoom: 'Three are already active. Set one aside first.',
};
