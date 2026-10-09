// Rejection Therapy: 100 numbered cards, done one at a time.
import { toISODate } from './dates';
import { put, type Outcome } from './changes';
import { REJECTION_TOTAL, type CommandContext, type PlannerState, type Rejection } from './model';

/**
 * The cards done, one per number, in number order. Each card's document id is
 * its number, so two devices doing the same card write the same document; if
 * duplicates appear anyway, the earliest wins.
 */
export function doneCards(state: PlannerState): Rejection[] {
  const byNumber = new Map<number, Rejection>();
  for (const r of [...state.rejections].sort((a, b) => a.createdAt - b.createdAt)) {
    if (r.n >= 1 && r.n <= REJECTION_TOTAL && !byNumber.has(r.n)) byNumber.set(r.n, r);
  }
  return [...byNumber.values()].sort((a, b) => a.n - b.n);
}

export const rejectionId = (n: number) => `no-${String(n).padStart(3, '0')}`;

export type RejectionError = 'text-required' | 'all-done';

/** Fills in the current card with what happened, and moves on to the next. */
export function logRejection(state: PlannerState, text: string, ctx: CommandContext): Outcome<RejectionError> {
  const t = text.trim();
  if (!t) return { ok: false, error: 'text-required' };
  const n = Math.max(0, ...state.rejections.map(r => r.n)) + 1;
  if (n > REJECTION_TOTAL) return { ok: false, error: 'all-done' };
  return { ok: true, changes: [put('rejections', { id: rejectionId(n), n, text: t, date: toISODate(ctx.now), createdAt: ctx.now.getTime() })] };
}

export function rejectionProgress(state: PlannerState): { done: number; current: number | null; percent: number } {
  const done = doneCards(state).length;
  const highest = Math.max(0, ...state.rejections.map(r => r.n));
  return { done, current: highest < REJECTION_TOTAL ? highest + 1 : null, percent: Math.round((done / REJECTION_TOTAL) * 100) };
}
