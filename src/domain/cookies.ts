// Deathcookies: urgent to-dos that need doing as soon as possible. They are
// never deleted: ticking one off records when, and clearing hides it.
import { put, type Change } from './changes';
import { ordered, type CommandContext, type Cookie, type PlannerState } from './model';

export function addCookie(text: string, ctx: CommandContext): Change[] {
  const t = text.trim();
  if (!t) return [];
  return [put('cookies', { id: ctx.newId(), text: t, done: false, createdAt: ctx.now.getTime(), completedAt: null, clearedAt: null })];
}

/** Ticks a deathcookie off (recording when) or back on. */
export function toggleCookie(state: PlannerState, id: string, ctx: CommandContext): Change[] {
  const c = state.cookies.find(x => x.id === id);
  if (!c) return [];
  return [put('cookies', c.done ? { ...c, done: false, completedAt: null } : { ...c, done: true, completedAt: ctx.now.getTime() })];
}

/** Takes the done ones off the list; they stay in the history. */
export function clearDoneCookies(state: PlannerState, ctx: CommandContext): Change[] {
  return visibleCookies(state.cookies).filter(c => c.done).map(c => put('cookies', { ...c, clearedAt: ctx.now.getTime() }));
}

/** The list as shown: everything not yet cleared, oldest first. */
export function visibleCookies(cookies: readonly Cookie[]): Cookie[] {
  return ordered(cookies).filter(c => c.clearedAt == null);
}

export function openCookies(cookies: readonly Cookie[]): Cookie[] {
  return visibleCookies(cookies).filter(c => !c.done);
}
