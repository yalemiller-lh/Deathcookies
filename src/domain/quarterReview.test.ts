import { describe, expect, it } from 'vitest';
import { applyChanges } from './changes';
import { workingQuarter } from './dates';
import { closeQuarter, reviewSummary } from './quarterReview';
import { activePriorities } from './priorities';
import { priority, stateWith, testContext } from '../test/fixtures';

const base = () => stateWith({
  priorities: [priority('p1', { adjust: 'Old note' }), priority('p2'), priority('p3'), priority('p4', { status: 'paused' })],
  projects: [{ id: 'j1', name: 'Kept project', priorityId: 'p3', createdAt: 1 }],
});

describe('closeQuarter', () => {
  it('refuses outside the last 14 days of the quarter', () => {
    expect(closeQuarter(base(), {}, testContext('2026-10-07'))).toEqual({ ok: false, error: 'review-not-open' });
  });

  it('applies continue, adjust and retire, and moves to the next quarter', () => {
    const s0 = base();
    const drafts = {
      p1: { decision: 'continue' as const, outcome: 'Went well' },
      p2: { decision: 'adjust' as const, change: ' Earlier starts ' },
      p3: { decision: 'retire' as const },
    };
    expect(reviewSummary(s0, drafts)).toEqual({ continue: 1, adjust: 1, retire: 1 });
    const ctx = testContext('2026-10-29');
    const out = closeQuarter(s0, drafts, ctx);
    if (!out.ok) throw new Error(out.error);
    expect(out.carried).toBe(2);
    expect(out.closed.key).toBe('24-1');
    expect(out.next.key).toBe('24-2');

    const s = applyChanges(s0, out.changes);
    expect(activePriorities(s).map(p => [p.id, p.adjust])).toEqual([['p1', null], ['p2', 'Earlier starts']]);
    expect(s.priorities.find(p => p.id === 'p4')?.status).toBe('paused');
    expect(s.projects[0]).toMatchObject({ name: 'Kept project', priorityId: null });
    expect(s.quarterReviews[0]).toMatchObject({ quarterKey: '24-1', date: '2026-10-29' });
    expect(s.quarterReviews[0]!.decisions.map(d => d.decision)).toEqual(['continue', 'adjust', 'retire']);
    expect(workingQuarter(s.settings.birthday!, ctx.now, s.settings.closedQuarterKeys).key).toBe('24-2');
  });

  it('cannot close the same quarter twice', () => {
    const s0 = base();
    const ctx = testContext('2026-10-29');
    const first = closeQuarter(s0, {}, ctx);
    if (!first.ok) throw new Error(first.error);
    expect(closeQuarter(applyChanges(s0, first.changes), {}, ctx)).toEqual({ ok: false, error: 'review-not-open' });
  });
});
