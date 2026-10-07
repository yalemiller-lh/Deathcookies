import { describe, expect, it } from 'vitest';
import { applyChanges } from './changes';
import { addCookie, clearDoneCookies, openCookies, toggleCookie, visibleCookies } from './cookies';
import { activePriorities, pausePriority, pausedPriorities, resumePriority, savePriority, type PriorityDraft } from './priorities';
import { addProject, logActivity, projectsFor, recentActivity } from './projects';
import { addIdea, ideasNewestFirst, promoteIdea, removeIdea } from './backburner';
import { parseISODate } from './dates';
import { priority, stateWith, testContext } from '../test/fixtures';

const draft = (patch: Partial<PriorityDraft> = {}): PriorityDraft => ({ id: null, title: 'Run', category: 'health', why: '', progress: '', projectIds: [], ...patch });

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

describe('priorities', () => {
  it('creates a priority and connects the chosen projects', () => {
    const ctx = testContext();
    const s0 = stateWith({ projects: [{ id: 'j1', name: 'Route', priorityId: null, createdAt: 1 }] });
    const out = savePriority(s0, draft({ title: ' Run three mornings ', projectIds: ['j1'] }), ctx);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const s = applyChanges(s0, out.changes);
    expect(activePriorities(s)).toMatchObject([{ id: out.priorityId, title: 'Run three mornings', category: 'health', status: 'active' }]);
    expect(projectsFor(s, out.priorityId).map(j => j.id)).toEqual(['j1']);
  });

  it('requires a title', () => {
    expect(savePriority(stateWith(), draft({ title: '  ' }), testContext())).toEqual({ ok: false, error: 'title-required' });
  });

  it('holds at most three active priorities', () => {
    const s = stateWith({ priorities: [priority('a'), priority('b'), priority('c')] });
    expect(savePriority(s, draft(), testContext())).toEqual({ ok: false, error: 'no-room' });
  });

  it('editing disconnects projects that were unticked', () => {
    const s0 = stateWith({
      priorities: [priority('p1')],
      projects: [{ id: 'j1', name: 'A', priorityId: 'p1', createdAt: 1 }, { id: 'j2', name: 'B', priorityId: 'p1', createdAt: 2 }],
    });
    const out = savePriority(s0, draft({ id: 'p1', title: 'Renamed', projectIds: ['j2'] }), testContext());
    if (!out.ok) throw new Error(out.error);
    const s = applyChanges(s0, out.changes);
    expect(s.priorities[0]!.title).toBe('Renamed');
    expect(s.projects.map(j => j.priorityId)).toEqual([null, 'p1']);
  });

  it('sets a priority aside and brings it back only when there is room', () => {
    let s = stateWith({ priorities: [priority('a'), priority('b'), priority('c')] });
    s = applyChanges(s, pausePriority(s, 'b'));
    expect(pausedPriorities(s).map(p => p.id)).toEqual(['b']);
    const full = applyChanges(s, [{ op: 'put', collection: 'priorities', value: priority('d') }]);
    expect(resumePriority(full, 'b')).toEqual({ ok: false, error: 'no-room' });
    const back = resumePriority(s, 'b');
    if (!back.ok) throw new Error(back.error);
    expect(activePriorities(applyChanges(s, back.changes)).map(p => p.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('projects and activity', () => {
  it('adds a project under a priority', () => {
    const s0 = stateWith({ priorities: [priority('p1')] });
    const s = applyChanges(s0, addProject(s0, ' Electrics ', 'p1', testContext()));
    expect(projectsFor(s, 'p1').map(j => j.name)).toEqual(['Electrics']);
    expect(addProject(s0, 'x', 'missing', testContext())).toEqual([]);
  });

  it('shows the newest activity from the past seven days, else nothing', () => {
    const s0 = stateWith({ projects: [{ id: 'j1', name: 'Route', priorityId: null, createdAt: 1 }] });
    let s = applyChanges(s0, logActivity(s0, 'j1', 'Canal loop', testContext('2026-09-29')));
    s = applyChanges(s, logActivity(s, 'j1', '5 km in the rain', testContext('2026-10-01', 10)));
    expect(recentActivity(s.activity, ['j1'], parseISODate('2026-10-07'))?.text).toBe('5 km in the rain');
    expect(recentActivity(s.activity, ['j1'], parseISODate('2026-10-08'))).toBeNull();
    expect(recentActivity(s.activity, ['other'], parseISODate('2026-10-07'))).toBeNull();
  });
});

describe('backburner', () => {
  it('lists ideas newest first and removes them', () => {
    const ctx = testContext();
    let s = stateWith();
    s = applyChanges(s, addIdea('Woodworking course', ctx)); ctx.advance();
    s = applyChanges(s, addIdea('Bass clef', ctx));
    expect(ideasNewestFirst(s).map(i => i.text)).toEqual(['Bass clef', 'Woodworking course']);
    s = applyChanges(s, removeIdea(s, ideasNewestFirst(s)[0]!.id));
    expect(s.backburner.map(i => i.text)).toEqual(['Woodworking course']);
  });

  it('promotes an idea into a free slot', () => {
    const s0 = stateWith({ priorities: [priority('a')], backburner: [{ id: 'i1', text: 'Cook from the recipe box', date: '2026-09-26', createdAt: 1 }] });
    const out = promoteIdea(s0, 'i1', null, testContext());
    if (!out.ok) throw new Error(out.error);
    const s = applyChanges(s0, out.changes);
    expect(s.backburner).toEqual([]);
    expect(activePriorities(s).map(p => p.title)).toEqual(['Priority a', 'Cook from the recipe box']);
  });

  it('with three active, promotes only by setting one aside', () => {
    const s0 = stateWith({ priorities: [priority('a'), priority('b'), priority('c')], backburner: [{ id: 'i1', text: 'New', date: '2026-09-26', createdAt: 1 }] });
    expect(promoteIdea(s0, 'i1', null, testContext())).toEqual({ ok: false, error: 'no-room' });
    const out = promoteIdea(s0, 'i1', 'b', testContext());
    if (!out.ok) throw new Error(out.error);
    const s = applyChanges(s0, out.changes);
    expect(activePriorities(s).map(p => p.title)).toEqual(['Priority a', 'Priority c', 'New']);
    expect(pausedPriorities(s).map(p => p.id)).toEqual(['b']);
  });
});
