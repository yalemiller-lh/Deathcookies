// The quarter review: decide for each active priority whether to continue,
// adjust or retire it, then close the quarter.
import { isReviewWindowOpen, quarterAfter, toISODate, workingQuarter, type Quarter } from './dates';
import { patchSettings, put, remove, type Change, type Outcome } from './changes';
import { type CommandContext, type Decision, type PlannerState, type PriorityDecision } from './model';
import { activePriorities } from './priorities';

export interface ReviewDraft {
  outcome: string;
  decision: Decision;
  /** "What changes next quarter?" — used when the decision is adjust. */
  change: string;
}

export type ReviewDrafts = Readonly<Record<string, Partial<ReviewDraft>>>;

export function reviewDraftFor(drafts: ReviewDrafts, priorityId: string): ReviewDraft {
  return { outcome: '', decision: 'continue', change: '', ...drafts[priorityId] };
}

export function reviewSummary(state: PlannerState, drafts: ReviewDrafts): Record<Decision, number> {
  const counts: Record<Decision, number> = { continue: 0, adjust: 0, retire: 0 };
  for (const p of activePriorities(state)) counts[reviewDraftFor(drafts, p.id).decision]++;
  return counts;
}

export type CloseQuarterError = 'no-birthday' | 'review-not-open';

export function closeQuarter(state: PlannerState, drafts: ReviewDrafts, ctx: CommandContext): Outcome<CloseQuarterError, { closed: Quarter; next: Quarter; carried: number }> {
  const { birthday, closedQuarterKeys } = state.settings;
  if (!birthday) return { ok: false, error: 'no-birthday' };
  const q = workingQuarter(birthday, ctx.now, closedQuarterKeys);
  if (!isReviewWindowOpen(q, ctx.now)) return { ok: false, error: 'review-not-open' };

  const active = activePriorities(state);
  const decisions: PriorityDecision[] = active.map(p => {
    const d = reviewDraftFor(drafts, p.id);
    return { priorityId: p.id, title: p.title, decision: d.decision, outcome: d.outcome.trim(), change: d.decision === 'adjust' ? d.change.trim() : '' };
  });
  const retired = new Set(decisions.filter(d => d.decision === 'retire').map(d => d.priorityId));

  const changes: Change[] = [];
  for (const p of active) {
    if (retired.has(p.id)) { changes.push(remove('priorities', p.id)); continue; }
    const d = decisions.find(x => x.priorityId === p.id)!;
    // An adjustment note lasts one quarter: replaced by a new one, or cleared.
    const adjust = d.decision === 'adjust' && d.change ? d.change : null;
    if (adjust !== p.adjust) changes.push(put('priorities', { ...p, adjust }));
  }
  // Retiring a priority keeps its projects; they just lose the connection.
  for (const j of state.projects) if (j.priorityId && retired.has(j.priorityId)) changes.push(put('projects', { ...j, priorityId: null }));

  changes.push(put('quarterReviews', { id: ctx.newId(), quarterKey: q.key, date: toISODate(ctx.now), decisions, createdAt: ctx.now.getTime() }));
  changes.push(patchSettings({ closedQuarterKeys: [...closedQuarterKeys, q.key] }));
  return { ok: true, changes, closed: q, next: quarterAfter(q), carried: active.length - retired.size };
}
