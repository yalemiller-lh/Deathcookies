// Weeklies: a recurring checklist. A tick records the Monday of its week, so
// the list resets itself when a new week starts; nothing has to run on Monday.
import { addDays, mondayOf, toISODate } from './dates';
import { put, remove, type Change } from './changes';
import { ordered, type CommandContext, type PlannerState, type Weekly } from './model';

export function addWeekly(text: string, ctx: CommandContext): Change[] {
  const t = text.trim();
  if (!t) return [];
  return [put('weeklies', { id: ctx.newId(), text: t, doneWeek: null, createdAt: ctx.now.getTime() })];
}

export const isDoneThisWeek = (w: Weekly, today: Date) => w.doneWeek === toISODate(mondayOf(today));

/** Ticks it off for this week, or back on. */
export function toggleWeekly(state: PlannerState, id: string, ctx: CommandContext): Change[] {
  const w = state.weeklies.find(x => x.id === id);
  if (!w) return [];
  return [put('weeklies', { ...w, doneWeek: isDoneThisWeek(w, ctx.now) ? null : toISODate(mondayOf(ctx.now)) })];
}

export function removeWeekly(state: PlannerState, id: string): Change[] {
  return state.weeklies.some(w => w.id === id) ? [remove('weeklies', id)] : [];
}

export function weeklySummary(state: PlannerState, today: Date): { done: number; total: number } {
  return { done: state.weeklies.filter(w => isDoneThisWeek(w, today)).length, total: state.weeklies.length };
}

/** The Monday the ticks clear. */
export const nextReset = (today: Date) => addDays(mondayOf(today), 7);

export const orderedWeeklies = (state: PlannerState) => ordered(state.weeklies);
