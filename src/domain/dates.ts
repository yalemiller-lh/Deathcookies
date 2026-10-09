// Calendar math for the birthday-based planning year.
// All Dates here are local-midnight dates; times of day are ignored.

export type ISODate = string; // 'YYYY-MM-DD'

const MS_PER_DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y ?? NaN, (m ?? NaN) - 1, d ?? NaN);
}

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** True for a real calendar date written as YYYY-MM-DD (rejects 2023-02-30). */
export function isISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toISODate(parseISODate(s)) === s;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** The Monday that starts d's week (weeks run Monday to Sunday, local time). */
export function mondayOf(d: Date): Date {
  return addDays(d, -((d.getDay() + 6) % 7));
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** The given day in a month, clamped to the month's length (Jan 31 + 1 month → Feb 28/29). */
function clampedDate(year: number, monthIndex: number, day: number): Date {
  const first = new Date(year, monthIndex, 1);
  return new Date(first.getFullYear(), first.getMonth(), Math.min(day, daysInMonth(first.getFullYear(), first.getMonth())));
}

export function addMonths(d: Date, n: number): Date {
  return clampedDate(d.getFullYear(), d.getMonth() + n, d.getDate());
}

/** Whole days from a to b (positive when b is later). Safe across DST changes. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_PER_DAY);
}

export interface Quarter {
  /** Years lived at the start of this planning year (birthday 2002, year starting 2026 → 24). */
  yearNumber: number;
  /** 0–3 */
  index: number;
  start: Date;
  /** Last day of the quarter (inclusive). */
  end: Date;
  nextStart: Date;
  /** Stable id used to mark a quarter closed, e.g. '24-1'. */
  key: string;
}

const quarterKey = (yearNumber: number, index: number) => `${yearNumber}-${index}`;

/** The quarter of the birthday year that contains `today`. */
export function quarterOn(birthday: ISODate, today: Date): Quarter {
  const b = parseISODate(birthday);
  const day = startOfDay(today);
  let yearStart = clampedDate(day.getFullYear(), b.getMonth(), b.getDate());
  if (yearStart > day) yearStart = clampedDate(day.getFullYear() - 1, b.getMonth(), b.getDate());
  const yearNumber = yearStart.getFullYear() - b.getFullYear();
  const starts = [0, 1, 2, 3, 4].map(k => addMonths(yearStart, 3 * k)) as [Date, Date, Date, Date, Date];
  let index = 0;
  for (let k = 1; k < 4; k++) if (day >= starts[k]!) index = k;
  const start = starts[index]!;
  const nextStart = starts[index + 1]!;
  return { yearNumber, index, start, end: addDays(nextStart, -1), nextStart, key: quarterKey(yearNumber, index) };
}

export function quarterAfter(q: Quarter): Quarter {
  const yearNumber = q.yearNumber + (q.index === 3 ? 1 : 0);
  const index = (q.index + 1) % 4;
  const nextStart = addMonths(q.nextStart, 3);
  return { yearNumber, index, start: q.nextStart, end: addDays(nextStart, -1), nextStart, key: quarterKey(yearNumber, index) };
}

export interface QuarterProgress {
  /** The quarter has not started yet. */
  upcoming: boolean;
  totalDays: number;
  /** 1-based day of the quarter; 0 while upcoming. */
  dayNumber: number;
  daysLeft: number;
  totalWeeks: number;
  /** 1-based week of the quarter; 0 while upcoming. */
  week: number;
  weeksLeft: number;
  daysUntilStart: number;
}

export function quarterProgress(q: Quarter, today: Date): QuarterProgress {
  const totalDays = daysBetween(q.start, q.end) + 1;
  const totalWeeks = Math.ceil(totalDays / 7);
  const daysUntilStart = Math.max(0, daysBetween(today, q.start));
  if (daysUntilStart > 0) {
    return { upcoming: true, totalDays, dayNumber: 0, daysLeft: totalDays, totalWeeks, week: 0, weeksLeft: totalWeeks, daysUntilStart };
  }
  const dayNumber = daysBetween(q.start, today) + 1;
  const week = Math.min(totalWeeks, Math.floor((dayNumber - 1) / 7) + 1);
  return { upcoming: false, totalDays, dayNumber, daysLeft: totalDays - dayNumber, totalWeeks, week, weeksLeft: totalWeeks - week, daysUntilStart: 0 };
}
