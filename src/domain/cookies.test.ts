import { describe, expect, it } from 'vitest';
import { applyChanges } from './changes';
import { addCookie, clearDoneCookies, openCookies, toggleCookie, visibleCookies } from './cookies';
import { stateWith, testContext } from '../test/fixtures';

describe('deathcookies', () => {
  it('adds trimmed text and ignores blanks', () => {
    const ctx = testContext();
    expect(addCookie('   ', ctx)).toEqual([]);
    const s = applyChanges(stateWith(), addCookie('  Pay the deposit ', ctx));
    expect(s.cookies).toMatchObject([{ text: 'Pay the deposit', done: false }]);
  });

  it('toggles, counts open ones in order, and clears the done ones off the list', () => {
    const ctx = testContext();
    let s = stateWith();
    for (const t of ['a', 'b', 'c']) { s = applyChanges(s, addCookie(t, ctx)); ctx.advance(); }
    const b = s.cookies.find(c => c.text === 'b')!;
    s = applyChanges(s, toggleCookie(s, b.id, ctx));
    expect(openCookies(s.cookies).map(c => c.text)).toEqual(['a', 'c']);
    s = applyChanges(s, clearDoneCookies(s, ctx));
    expect(visibleCookies(s.cookies).map(c => c.text)).toEqual(['a', 'c']);
  });

  it('keeps when each was created, completed and cleared', () => {
    const ctx = testContext('2026-10-07');
    let s = applyChanges(stateWith(), addCookie('Pay', ctx));
    const created = ctx.now.getTime();
    const id = s.cookies[0]!.id;
    ctx.advance();
    s = applyChanges(s, toggleCookie(s, id, ctx));
    const completed = ctx.now.getTime();
    expect(s.cookies[0]).toMatchObject({ done: true, createdAt: created, completedAt: completed, clearedAt: null });

    ctx.advance();
    s = applyChanges(s, clearDoneCookies(s, ctx));
    expect(s.cookies).toHaveLength(1);
    expect(s.cookies[0]).toMatchObject({ completedAt: completed, clearedAt: ctx.now.getTime() });
    expect(clearDoneCookies(s, ctx)).toEqual([]);
  });

  it('unticking forgets the completion time', () => {
    const ctx = testContext();
    let s = applyChanges(stateWith(), addCookie('Pay', ctx));
    const id = s.cookies[0]!.id;
    s = applyChanges(s, toggleCookie(s, id, ctx));
    s = applyChanges(s, toggleCookie(s, id, ctx));
    expect(s.cookies[0]).toMatchObject({ done: false, completedAt: null });
  });
});
