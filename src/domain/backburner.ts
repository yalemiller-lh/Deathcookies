// Backburner: ideas to think on, which can be promoted to priorities.
import { toISODate } from './dates';
import { put, remove, type Change, type Outcome } from './changes';
import { type CommandContext, type PlannerState } from './model';
import { activePriorities, newPriority, pausePriority, roomForPriorities } from './priorities';

export function addIdea(text: string, ctx: CommandContext): Change[] {
  const t = text.trim();
  if (!t) return [];
  return [put('backburner', { id: ctx.newId(), text: t, date: toISODate(ctx.now), createdAt: ctx.now.getTime() })];
}

export function removeIdea(state: PlannerState, id: string): Change[] {
  return state.backburner.some(i => i.id === id) ? [remove('backburner', id)] : [];
}

/** Newest first, as the backburner list shows them. */
export function ideasNewestFirst(state: PlannerState) {
  return [...state.backburner].sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
}

export type PromoteError = 'not-found' | 'no-room';

/**
 * Turn an idea into an active priority. When three are already active,
 * `setAsideId` names the one to pause to make room.
 */
export function promoteIdea(state: PlannerState, ideaId: string, setAsideId: string | null, ctx: CommandContext): Outcome<PromoteError, { priorityId: string }> {
  const idea = state.backburner.find(i => i.id === ideaId);
  if (!idea) return { ok: false, error: 'not-found' };
  let pause: Change[] = [];
  if (setAsideId !== null) {
    if (!activePriorities(state).some(p => p.id === setAsideId)) return { ok: false, error: 'not-found' };
    pause = pausePriority(state, setAsideId);
  } else if (roomForPriorities(state) === 0) {
    return { ok: false, error: 'no-room' };
  }
  const priority = newPriority(idea.text, ctx);
  return { ok: true, priorityId: priority.id, changes: [...pause, put('priorities', priority), remove('backburner', idea.id)] };
}
