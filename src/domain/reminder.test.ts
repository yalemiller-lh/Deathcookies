import { describe, expect, it } from 'vitest';
import { localClock, reminderDueDate, reminderMessage } from './reminder';
import { checkBirthday, setBirthday, setReminder } from './settings';
import { quoteFor, QUOTES } from './quotes';
import { parseISODate } from './dates';
import { stateWith } from '../test/fixtures';

const cookie = (id: string, text: string, done = false, createdAt = 1) => ({ id, text, done, createdAt, completedAt: done ? 9 : null, clearedAt: null });

describe('reminderMessage', () => {
  it('counts open deathcookies and names the first', () => {
    expect(reminderMessage([cookie('a', 'Pay the deposit'), cookie('b', 'Renew tax', false, 2), cookie('c', 'Done', true, 0)]))
      .toEqual({ title: '2 deathcookies to eat', body: 'Start with: Pay the deposit' });
  });
  it('uses the singular for one', () => {
    expect(reminderMessage([cookie('a', 'Pay')]).title).toBe('1 deathcookie to eat');
  });
  it('has a clean-plate message for none', () => {
    expect(reminderMessage([cookie('a', 'x', true)])).toEqual({ title: 'No deathcookies today', body: 'Plate is clean. Nothing urgent to eat.' });
  });
});

describe('reminderDueDate', () => {
  const settings = { notificationsOn: true, notificationTime: '08:30', timeZone: 'America/New_York' };
  // 2026-10-07 12:30 UTC is 08:30 in New York (EDT, UTC-4).
  const at = (utc: string) => new Date(utc);

  it('reads the wall clock in the given zone', () => {
    expect(localClock(at('2026-10-07T12:30:00Z'), 'America/New_York')).toEqual({ date: '2026-10-07', minutes: 510 });
    expect(localClock(at('2026-10-07T02:00:00Z'), 'America/New_York').date).toBe('2026-10-06');
  });

  it('is due from the chosen time for three hours, once per day', () => {
    expect(reminderDueDate(settings, at('2026-10-07T12:29:00Z'), null)).toBeNull();
    expect(reminderDueDate(settings, at('2026-10-07T12:30:00Z'), null)).toBe('2026-10-07');
    expect(reminderDueDate(settings, at('2026-10-07T13:15:00Z'), '2026-10-06')).toBe('2026-10-07');
    expect(reminderDueDate(settings, at('2026-10-07T13:15:00Z'), '2026-10-07')).toBeNull();
    expect(reminderDueDate(settings, at('2026-10-07T15:29:00Z'), null)).toBe('2026-10-07');
    expect(reminderDueDate(settings, at('2026-10-07T15:30:00Z'), null)).toBeNull();
  });

  it('is never due when switched off', () => {
    expect(reminderDueDate({ ...settings, notificationsOn: false }, at('2026-10-07T12:30:00Z'), null)).toBeNull();
  });
});

describe('settings', () => {
  const today = parseISODate('2026-10-07');

  it('accepts only real past birthdays', () => {
    expect(checkBirthday('2002-05-01', today)).toBeNull();
    expect(checkBirthday('2026-10-07', today)).toBe('future');
    expect(checkBirthday('2002-02-30', today)).toBe('invalid');
  });

  it('changing the birthday clears closed-quarter marks', () => {
    const out = setBirthday(stateWith({}, { closedQuarterKeys: ['24-1'] }), '2002-06-15', today);
    expect(out).toEqual({ ok: true, changes: [{ op: 'settings', patch: { birthday: '2002-06-15', closedQuarterKeys: [] } }] });
  });

  it('validates reminder time and zone', () => {
    expect(setReminder({ notificationTime: '25:00' })).toEqual({ ok: false, error: 'invalid-time' });
    expect(setReminder({ timeZone: 'Mars/Olympus' })).toEqual({ ok: false, error: 'invalid-time-zone' });
    expect(setReminder({ notificationsOn: true, notificationTime: '07:15' }).ok).toBe(true);
  });
});

describe('quoteFor', () => {
  it('rotates daily through the list', () => {
    expect(quoteFor(parseISODate('2026-01-01'))).toBe(QUOTES[0]);
    expect(quoteFor(parseISODate('2026-01-02'))).toBe(QUOTES[1]);
    expect(quoteFor(parseISODate('2026-01-09'))).toBe(QUOTES[0]);
  });
});
