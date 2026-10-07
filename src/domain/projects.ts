// Projects hang off priorities; activity entries record what happened on them.
import { daysBetween, parseISODate, toISODate } from './dates';
import { put, type Change } from './changes';
import { ordered, type Activity, type CommandContext, type PlannerState } from './model';

export function addProject(state: PlannerState, name: string, priorityId: string | null, ctx: CommandContext): Change[] {
  const n = name.trim();
  if (!n) return [];
  if (priorityId !== null && !state.priorities.some(p => p.id === priorityId)) return [];
  return [put('projects', { id: ctx.newId(), name: n, priorityId, createdAt: ctx.now.getTime() })];
}

export function projectsFor(state: PlannerState, priorityId: string) {
  return ordered(state.projects).filter(j => j.priorityId === priorityId);
}

export function logActivity(state: PlannerState, projectId: string, text: string, ctx: CommandContext): Change[] {
  const t = text.trim();
  if (!t || !state.projects.some(j => j.id === projectId)) return [];
  return [put('activity', { id: ctx.newId(), projectId, date: toISODate(ctx.now), text: t, createdAt: ctx.now.getTime() })];
}

/** Activity counts as recent for this many days, today included. */
export const RECENT_ACTIVITY_DAYS = 7;

/** The newest activity on any of the projects within the recent window, or null ("quiet"). */
export function recentActivity(activity: readonly Activity[], projectIds: readonly string[], today: Date): Activity | null {
  const recent = activity.filter(a => {
    if (!projectIds.includes(a.projectId)) return false;
    const age = daysBetween(parseISODate(a.date), today);
    return age >= 0 && age < RECENT_ACTIVITY_DAYS;
  });
  const sorted = ordered(recent).sort((a, b) => a.date.localeCompare(b.date));
  return sorted.at(-1) ?? null;
}
