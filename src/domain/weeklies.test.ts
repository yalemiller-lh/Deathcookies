import { describe, expect, it } from 'vitest';
import { applyChanges } from './changes';
import { parseISODate, toISODate } from './dates';
import { addWeekly, isDoneThisWeek, nextReset, orderedWeeklies, removeWeekly, toggleWeekly, weeklySummary } from './weeklies';
import { stateWith, testContext } from '../test/fixtures';

const d = parseISODate;

describe('weeklies', () => {
  it('adds trimmed items in order and ignores blanks', () => {
    const ctx = testContext('2026-10-07');
    expect(addWeekly('   ', ctx)).toEqual([]);
    let s = applyChanges(stateWith(), addWeekly(' LinkedIn post ', ctx));
    ctx.advance();
    s = applyChanges(s, addWeekly('Substack', ctx));
    expect(orderedWeeklies(s).map(w => [w.text, w.doneWeek])).toEqual([['LinkedIn post', null], ['Substack', null]]);
  });

  it('ticks an item for this week, keyed by its Monday, and unticks it', () => {
    const ctx = testContext('2026-10-07'); // a Wednesday
    let s = applyChanges(stateWith(), addWeekly('Substack', ctx));
    const id = s.weeklies[0]!.id;
    s = applyChanges(s, toggleWeekly(s, id, ctx));
    expect(s.weeklies[0]!.doneWeek).toBe('2026-10-05');
    expect(weeklySummary(s, d('2026-10-07'))).toEqual({ done: 1, total: 1 });
    s = applyChanges(s, toggleWeekly(s, id, ctx));
    expect(s.weeklies[0]!.doneWeek).toBeNull();
  });

  it('resets itself on Monday: last week’s ticks stop counting', () => {
    const ctx = testContext('2026-10-11'); // Sunday
    let s = applyChanges(stateWith(), addWeekly('Call Nan', ctx));
    s = applyChanges(s, toggleWeekly(s, s.weeklies[0]!.id, ctx));
    const w = s.weeklies[0]!;
    expect(isDoneThisWeek(w, d('2026-10-11'))).toBe(true);
    expect(isDoneThisWeek(w, d('2026-10-12'))).toBe(false); // Monday
    expect(weeklySummary(s, d('2026-10-12'))).toEqual({ done: 0, total: 1 });
  });

  it('ticking a stale item ticks it for the new week', () => {
    const s0 = stateWith({ weeklies: [{ id: 'w1', text: 'Call Nan', doneWeek: '2026-09-28', createdAt: 1 }] });
    const s = applyChanges(s0, toggleWeekly(s0, 'w1', testContext('2026-10-07')));
    expect(s.weeklies[0]!.doneWeek).toBe('2026-10-05');
  });

  it('removes items', () => {
    const s0 = stateWith({ weeklies: [{ id: 'w1', text: 'Call Nan', doneWeek: null, createdAt: 1 }] });
    expect(applyChanges(s0, removeWeekly(s0, 'w1')).weeklies).toEqual([]);
    expect(removeWeekly(s0, 'nope')).toEqual([]);
  });

  it('says when the ticks next clear', () => {
    expect(toISODate(nextReset(d('2026-10-07')))).toBe('2026-10-12');
    expect(toISODate(nextReset(d('2026-10-12')))).toBe('2026-10-19');
  });
});
