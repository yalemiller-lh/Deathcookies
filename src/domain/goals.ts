// Major goals: the big things being worked toward. Ticking one records when it
// was achieved; it stays on the list until removed.
import { put, remove, type Change } from './changes';
import { ordered, type CommandContext, type PlannerState } from './model';

export function addGoal(text: string, ctx: CommandContext): Change[] {
  const t = text.trim();
  if (!t) return [];
  return [put('goals', { id: ctx.newId(), text: t, done: false, completedAt: null, createdAt: ctx.now.getTime() })];
}

/** Marks it achieved (recording when), or not. */
export function toggleGoal(state: PlannerState, id: string, ctx: CommandContext): Change[] {
  const g = state.goals.find(x => x.id === id);
  if (!g) return [];
  return [put('goals', g.done ? { ...g, done: false, completedAt: null } : { ...g, done: true, completedAt: ctx.now.getTime() })];
}

export function removeGoal(state: PlannerState, id: string): Change[] {
  return state.goals.some(g => g.id === id) ? [remove('goals', id)] : [];
}

export function goalSummary(state: PlannerState): { done: number; total: number } {
  return { done: state.goals.filter(g => g.done).length, total: state.goals.length };
}

export const orderedGoals = (state: PlannerState) => ordered(state.goals);
