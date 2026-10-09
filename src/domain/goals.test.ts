import { describe, expect, it } from 'vitest';
import { applyChanges } from './changes';
import { addGoal, goalSummary, orderedGoals, removeGoal, toggleGoal } from './goals';
import { stateWith, testContext } from '../test/fixtures';

describe('major goals', () => {
  it('adds trimmed goals in order and ignores blanks', () => {
    const ctx = testContext();
    expect(addGoal('  ', ctx)).toEqual([]);
    let s = applyChanges(stateWith(), addGoal(' Run a half marathon ', ctx));
    ctx.advance();
    s = applyChanges(s, addGoal('Finish the studio', ctx));
    expect(orderedGoals(s).map(g => [g.text, g.done, g.completedAt])).toEqual([['Run a half marathon', false, null], ['Finish the studio', false, null]]);
    expect(goalSummary(s)).toEqual({ done: 0, total: 2 });
  });

  it('records when a goal is achieved, and forgets it if unticked', () => {
    const ctx = testContext('2026-10-09');
    let s = applyChanges(stateWith(), addGoal('Finish the studio', ctx));
    const id = s.goals[0]!.id;
    ctx.advance();
    s = applyChanges(s, toggleGoal(s, id, ctx));
    expect(s.goals[0]).toMatchObject({ done: true, completedAt: ctx.now.getTime() });
    expect(goalSummary(s)).toEqual({ done: 1, total: 1 });
    s = applyChanges(s, toggleGoal(s, id, ctx));
    expect(s.goals[0]).toMatchObject({ done: false, completedAt: null });
  });

  it('removes goals', () => {
    const s0 = stateWith({ goals: [{ id: 'g1', text: 'Big thing', done: false, completedAt: null, createdAt: 1 }] });
    expect(applyChanges(s0, removeGoal(s0, 'g1')).goals).toEqual([]);
    expect(removeGoal(s0, 'nope')).toEqual([]);
  });
});
