// Test helpers: a deterministic command context and a quick state builder.
import { parseISODate } from '../domain/dates';
import { emptyState, type CommandContext, type Cookie, type PlannerState } from '../domain/model';

export function testContext(isoDate = '2026-10-07', startAt = 1): CommandContext & { advance: () => void } {
  let n = startAt;
  const ctx = {
    now: parseISODate(isoDate),
    newId: () => `id${n++}`,
    advance: () => { ctx.now = new Date(ctx.now.getTime() + 1000); },
  };
  return ctx;
}

export function cookie(id: string, text: string, patch: Partial<Cookie> = {}): Cookie {
  return { id, text, done: false, createdAt: 1, completedAt: null, clearedAt: null, ...patch };
}

export function stateWith(patch: Partial<PlannerState> = {}, settings: Partial<PlannerState['settings']> = {}): PlannerState {
  const s = emptyState('UTC');
  return { ...s, ...patch, settings: { ...s.settings, birthday: '2002-05-01', ...settings } };
}
