// Priorities: at most three active goals for the quarter, each with projects.
import { put, type Change, type Outcome } from './changes';
import { MAX_ACTIVE_PRIORITIES, ordered, type Category, type CommandContext, type PlannerState, type Priority } from './model';

export const activePriorities = (state: PlannerState) => ordered(state.priorities).filter(p => p.status === 'active');
export const pausedPriorities = (state: PlannerState) => ordered(state.priorities).filter(p => p.status === 'paused');
export const roomForPriorities = (state: PlannerState) => Math.max(0, MAX_ACTIVE_PRIORITIES - activePriorities(state).length);

export function newPriority(title: string, ctx: CommandContext): Priority {
  return { id: ctx.newId(), title, category: null, why: '', progress: '', status: 'active', adjust: null, createdAt: ctx.now.getTime() };
}

export interface PriorityDraft {
  /** null when creating a new priority. */
  id: string | null;
  title: string;
  category: Category | null;
  why: string;
  progress: string;
  /** Projects that should be connected to this priority after saving. */
  projectIds: string[];
}

export type SavePriorityError = 'title-required' | 'no-room' | 'not-found';

/** Connect exactly `projectIds` to the priority; disconnect any others it had. */
function linkProjects(state: PlannerState, priorityId: string, projectIds: readonly string[]): Change[] {
  return state.projects.flatMap(j => {
    const want = projectIds.includes(j.id);
    if (want && j.priorityId !== priorityId) return [put('projects', { ...j, priorityId })];
    if (!want && j.priorityId === priorityId) return [put('projects', { ...j, priorityId: null })];
    return [];
  });
}

export function savePriority(state: PlannerState, draft: PriorityDraft, ctx: CommandContext): Outcome<SavePriorityError, { priorityId: string }> {
  const title = draft.title.trim();
  if (!title) return { ok: false, error: 'title-required' };
  const fields = { title, category: draft.category, why: draft.why.trim(), progress: draft.progress.trim() };
  let priority: Priority;
  if (draft.id === null) {
    if (roomForPriorities(state) === 0) return { ok: false, error: 'no-room' };
    priority = { ...newPriority(title, ctx), ...fields };
  } else {
    const existing = state.priorities.find(p => p.id === draft.id);
    if (!existing) return { ok: false, error: 'not-found' };
    priority = { ...existing, ...fields };
  }
  return { ok: true, priorityId: priority.id, changes: [put('priorities', priority), ...linkProjects(state, priority.id, draft.projectIds)] };
}

/** Set a priority aside. It keeps its notes and projects. */
export function pausePriority(state: PlannerState, id: string): Change[] {
  const p = state.priorities.find(x => x.id === id);
  return p && p.status === 'active' ? [put('priorities', { ...p, status: 'paused' })] : [];
}

export type ResumeError = 'no-room' | 'not-found';

export function resumePriority(state: PlannerState, id: string): Outcome<ResumeError> {
  const p = state.priorities.find(x => x.id === id);
  if (!p) return { ok: false, error: 'not-found' };
  if (p.status === 'active') return { ok: true, changes: [] };
  if (roomForPriorities(state) === 0) return { ok: false, error: 'no-room' };
  return { ok: true, changes: [put('priorities', { ...p, status: 'active' })] };
}
