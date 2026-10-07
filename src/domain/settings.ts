// Changes to the planner's settings.
import { isISODate, parseISODate, startOfDay } from './dates';
import { patchSettings, type Outcome } from './changes';
import type { PlannerState } from './model';
import { isTimeOfDay, isTimeZone } from './reminder';

export type BirthdayError = 'invalid' | 'future';

/** A birthday must be a real date before today. */
export function checkBirthday(value: string, today: Date): BirthdayError | null {
  if (!isISODate(value)) return 'invalid';
  return parseISODate(value) < startOfDay(today) ? null : 'future';
}

export function setBirthday(state: PlannerState, value: string, today: Date): Outcome<BirthdayError> {
  const error = checkBirthday(value, today);
  if (error) return { ok: false, error };
  if (value === state.settings.birthday) return { ok: true, changes: [] };
  // Quarter keys are counted from the birthday, so old "closed" marks no longer apply.
  return { ok: true, changes: [patchSettings({ birthday: value, closedQuarterKeys: [] })] };
}

export type ReminderError = 'invalid-time' | 'invalid-time-zone';

export function setReminder(patch: { notificationsOn?: boolean; notificationTime?: string; timeZone?: string }): Outcome<ReminderError> {
  if (patch.notificationTime !== undefined && !isTimeOfDay(patch.notificationTime)) return { ok: false, error: 'invalid-time' };
  if (patch.timeZone !== undefined && !isTimeZone(patch.timeZone)) return { ok: false, error: 'invalid-time-zone' };
  return { ok: true, changes: [patchSettings(patch)] };
}
