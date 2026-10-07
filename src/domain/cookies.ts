// Deathcookies: urgent to-dos that need doing as soon as possible.
import { put, remove, type Change } from './changes';
import { ordered, type CommandContext, type Cookie, type PlannerState } from './model';

export function addCookie(text: string, ctx: CommandContext): Change[] {
  const t = text.trim();
  if (!t) return [];
  return [put('cookies', { id: ctx.newId(), text: t, done: false, createdAt: ctx.now.getTime() })];
}

export function toggleCookie(state: PlannerState, id: string): Change[] {
  const c = state.cookies.find(x => x.id === id);
  return c ? [put('cookies', { ...c, done: !c.done })] : [];
}

export function clearDoneCookies(state: PlannerState): Change[] {
  return state.cookies.filter(c => c.done).map(c => remove('cookies', c.id));
}

export function openCookies(cookies: readonly Cookie[]): Cookie[] {
  return ordered(cookies).filter(c => !c.done);
}
