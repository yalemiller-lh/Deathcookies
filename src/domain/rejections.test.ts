import { describe, expect, it } from 'vitest';
import { applyChanges } from './changes';
import { REJECTION_TOTAL, type Rejection } from './model';
import { doneCards, logRejection, rejectionId, rejectionProgress } from './rejections';
import { stateWith, testContext } from '../test/fixtures';

const card = (n: number, createdAt = n): Rejection => ({ id: rejectionId(n), n, text: `Ask ${n}`, date: '2026-10-05', createdAt });
const changesOf = (out: ReturnType<typeof logRejection>) => { if (!out.ok) throw new Error(out.error); return out.changes; };

describe('rejection therapy', () => {
  it('starts at card 1 with nothing done', () => {
    expect(rejectionProgress(stateWith())).toEqual({ done: 0, current: 1, percent: 0 });
  });

  it('fills in the current card with what happened and today’s date, and moves on', () => {
    const ctx = testContext('2026-10-07');
    let s = applyChanges(stateWith(), changesOf(logRejection(stateWith(), ' Asked for a free refill. No. ', ctx)));
    s = applyChanges(s, changesOf(logRejection(s, 'Asked to skip the queue', ctx)));
    expect(doneCards(s).map(r => [r.n, r.text, r.date, r.id])).toEqual([
      [1, 'Asked for a free refill. No.', '2026-10-07', 'no-001'],
      [2, 'Asked to skip the queue', '2026-10-07', 'no-002'],
    ]);
    expect(rejectionProgress(s)).toEqual({ done: 2, current: 3, percent: 2 });
  });

  it('needs something written', () => {
    expect(logRejection(stateWith(), '   ', testContext())).toEqual({ ok: false, error: 'text-required' });
  });

  it('numbers from the highest card, so a second device carries on rather than repeating', () => {
    const s = stateWith({ rejections: [card(1), card(2)] });
    const [change] = changesOf(logRejection(s, 'Third', testContext()));
    expect(change).toMatchObject({ value: { n: 3, id: 'no-003' } });
  });

  it('counts a card done twice (two devices offline) once', () => {
    const s = stateWith({ rejections: [card(1, 5), { ...card(1, 9), id: 'other' }, card(2)] });
    expect(doneCards(s).map(r => [r.n, r.createdAt])).toEqual([[1, 5], [2, 2]]);
    expect(rejectionProgress(s).done).toBe(2);
  });

  it('stops after a hundred', () => {
    const all = stateWith({ rejections: Array.from({ length: REJECTION_TOTAL }, (_, i) => card(i + 1)) });
    expect(rejectionProgress(all)).toEqual({ done: 100, current: null, percent: 100 });
    expect(logRejection(all, 'One more', testContext())).toEqual({ ok: false, error: 'all-done' });
  });
});
