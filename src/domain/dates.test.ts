import { describe, expect, it } from 'vitest';
import {
  addMonths, dayOfYear, isISODate, isReviewWindowOpen, parseISODate, quarterAfter, quarterOn,
  quarterProgress, toISODate, workingQuarter,
} from './dates';

const d = parseISODate;
const range = (q: { start: Date; end: Date }) => `${toISODate(q.start)}..${toISODate(q.end)}`;

describe('ISO dates', () => {
  it('round-trips', () => {
    expect(toISODate(d('2026-10-07'))).toBe('2026-10-07');
  });
  it('rejects impossible and malformed dates', () => {
    expect(isISODate('2026-02-29')).toBe(false);
    expect(isISODate('2024-02-29')).toBe(true);
    expect(isISODate('2026-13-01')).toBe(false);
    expect(isISODate('26-10-07')).toBe(false);
    expect(isISODate('')).toBe(false);
  });
});

describe('addMonths', () => {
  it('clamps to the end of shorter months', () => {
    expect(toISODate(addMonths(d('2026-01-31'), 1))).toBe('2026-02-28');
    expect(toISODate(addMonths(d('2024-01-31'), 1))).toBe('2024-02-29');
    expect(toISODate(addMonths(d('2026-11-30'), 3))).toBe('2027-02-28');
  });
});

describe('quarterOn (birthday May 1, born 2002)', () => {
  const birthday = '2002-05-01';

  it('splits the year into four three-month quarters', () => {
    expect(range(quarterOn(birthday, d('2026-05-01')))).toBe('2026-05-01..2026-07-31');
    expect(range(quarterOn(birthday, d('2026-08-01')))).toBe('2026-08-01..2026-10-31');
    expect(range(quarterOn(birthday, d('2026-11-01')))).toBe('2026-11-01..2027-01-31');
    expect(range(quarterOn(birthday, d('2027-02-01')))).toBe('2027-02-01..2027-04-30');
  });

  it('numbers the year by age and keys each quarter', () => {
    const q = quarterOn(birthday, d('2026-10-07'));
    expect(q.yearNumber).toBe(24);
    expect(q.index).toBe(1);
    expect(q.key).toBe('24-1');
  });

  it('keeps the previous year until the birthday arrives', () => {
    const q = quarterOn(birthday, d('2027-04-30'));
    expect(q.yearNumber).toBe(24);
    expect(q.index).toBe(3);
    expect(quarterOn(birthday, d('2027-05-01')).yearNumber).toBe(25);
  });
});

describe('quarterOn edge birthdays', () => {
  it('a Feb 29 birthday starts the year on Feb 28 in common years', () => {
    const q = quarterOn('2000-02-29', d('2026-03-01'));
    expect(toISODate(q.start)).toBe('2026-02-28');
    expect(q.yearNumber).toBe(26);
  });
  it('a 31st birthday clamps later quarter starts', () => {
    const q = quarterOn('2001-08-31', d('2026-12-01'));
    expect(range(q)).toBe('2026-11-30..2027-02-27');
  });
});

describe('quarterAfter', () => {
  it('rolls into the next birthday year after the fourth quarter', () => {
    const q4 = quarterOn('2002-05-01', d('2027-03-01'));
    const next = quarterAfter(q4);
    expect(next.yearNumber).toBe(25);
    expect(next.index).toBe(0);
    expect(range(next)).toBe('2027-05-01..2027-07-31');
  });
});

describe('workingQuarter', () => {
  it('moves on to the next quarter once the current one is closed', () => {
    const q = workingQuarter('2002-05-01', d('2026-10-29'), ['24-1']);
    expect(q.key).toBe('24-2');
    expect(toISODate(q.start)).toBe('2026-11-01');
  });
});

describe('quarterProgress', () => {
  const q = quarterOn('2002-05-01', d('2026-10-07'));

  // The handoff README's sample line says "of 13", but its own rule
  // (ceil(92 days / 7)) and the prototype both give 14.
  it('reports week 10 of 14 on Oct 7', () => {
    const p = quarterProgress(q, d('2026-10-07'));
    expect(p).toMatchObject({ upcoming: false, totalDays: 92, dayNumber: 68, week: 10, totalWeeks: 14, weeksLeft: 4 });
  });

  it('caps the week at the total on the last day', () => {
    const p = quarterProgress(q, d('2026-10-31'));
    expect(p.week).toBe(p.totalWeeks);
    expect(p.weeksLeft).toBe(0);
    expect(p.daysLeft).toBe(0);
  });

  it('is upcoming before the quarter starts', () => {
    const next = quarterAfter(q);
    const p = quarterProgress(next, d('2026-10-29'));
    expect(p).toMatchObject({ upcoming: true, daysUntilStart: 3, week: 0 });
  });
});

describe('isReviewWindowOpen', () => {
  const q = quarterOn('2002-05-01', d('2026-10-07'));
  it('opens 14 days before the quarter ends', () => {
    expect(isReviewWindowOpen(q, d('2026-10-16'))).toBe(false);
    expect(isReviewWindowOpen(q, d('2026-10-17'))).toBe(true);
    expect(isReviewWindowOpen(q, d('2026-10-31'))).toBe(true);
  });
  it('is closed for a quarter that has not started', () => {
    expect(isReviewWindowOpen(quarterAfter(q), d('2026-10-29'))).toBe(false);
  });
});

describe('dayOfYear', () => {
  it('is zero-based', () => {
    expect(dayOfYear(d('2026-01-01'))).toBe(0);
    expect(dayOfYear(d('2026-12-31'))).toBe(364);
  });
});
