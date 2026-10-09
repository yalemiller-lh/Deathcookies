// Display text built from dates and domain values.
import type { QuarterProgress } from '../domain/dates';

const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-US', o);

export const monthDay = (d: Date) => fmt(d, { month: 'long', day: 'numeric' });
export const monthDayYear = (d: Date) => fmt(d, { month: 'long', day: 'numeric', year: 'numeric' });
export const weekdayMonthDay = (d: Date) => fmt(d, { weekday: 'long', month: 'long', day: 'numeric' });
/** 'Oct 5' */
export const shortDate = (d: Date) => fmt(d, { month: 'short', day: 'numeric' });

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function weekLine(p: QuarterProgress): string {
  if (p.upcoming) return `Quarter begins in ${plural(Math.ceil(p.daysUntilStart / 7), 'week', 'weeks')}`;
  return `Week ${p.week} of ${p.totalWeeks} · ${p.weeksLeft === 0 ? 'final week' : `${plural(p.weeksLeft, 'week', 'weeks')} left`}`;
}

/** '08:30' → '8:30 am' */
export function time12(t: string): string {
  const [h = 8, m = 30] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}
