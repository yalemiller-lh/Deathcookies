// Test helpers: a deterministic command context and a quick state builder.
import { parseISODate } from '../domain/dates';
import { emptyState, type CommandContext, type PlannerState, type Priority } from '../domain/model';

export function testContext(isoDate = '2026-10-07', startAt = 1): CommandContext & { advance: () => void } {
  let n = startAt;
  const ctx = {
    now: parseISODate(isoDate),
    newId: () => `id${n++}`,
    advance: () => { ctx.now = new Date(ctx.now.getTime() + 1000); },
  };
  return ctx;
}

let created = 0;

export function priority(id: string, patch: Partial<Priority> = {}): Priority {
  return { id, title: `Priority ${id}`, category: null, why: '', progress: '', status: 'active', adjust: null, createdAt: ++created, ...patch };
}

export function stateWith(patch: Partial<PlannerState> = {}, settings: Partial<PlannerState['settings']> = {}): PlannerState {
  const s = emptyState('UTC');
  return { ...s, ...patch, settings: { ...s.settings, birthday: '2002-05-01', ...settings } };
}
