import { describe, expect, it } from 'vitest';
import { patchSettings, put, remove } from '../domain/changes';
import { entityFromDoc, settingsFromDoc, StateAssembler, writesFor } from './firestoreMapping';
import { cookie } from '../test/fixtures';

describe('writesFor', () => {
  it('maps puts, deletes and settings patches to per-user document writes', () => {
    expect(writesFor('u1', [
      put('cookies', cookie('c1', 'Pay', { createdAt: 5 })),
      remove('backburner', 'i1'),
      patchSettings({ notificationsOn: true }),
    ])).toEqual([
      { kind: 'set', path: ['users', 'u1', 'cookies', 'c1'], data: { text: 'Pay', done: false, createdAt: 5, completedAt: null, clearedAt: null }, merge: false },
      { kind: 'delete', path: ['users', 'u1', 'backburner', 'i1'] },
      { kind: 'set', path: ['users', 'u1'], data: { notificationsOn: true }, merge: true },
    ]);
  });
});

describe('times', () => {
  it('writes created, completed and cleared times through the timestamp encoder', () => {
    const [w] = writesFor('u1', [put('cookies', cookie('c1', 'Pay', { createdAt: 5, done: true, completedAt: 7 }))], ms => ({ ts: ms }));
    expect(w).toMatchObject({ data: { createdAt: { ts: 5 }, completedAt: { ts: 7 }, clearedAt: null } });
  });

  it('reads timestamps and older plain numbers back as milliseconds', () => {
    const stamp = (ms: number) => ({ toMillis: () => ms });
    expect(entityFromDoc('cookies', 'c1', { text: 'Pay', done: true, createdAt: stamp(5), completedAt: stamp(7) }))
      .toEqual(cookie('c1', 'Pay', { createdAt: 5, done: true, completedAt: 7 }));
    expect(entityFromDoc('cookies', 'c2', { text: 'Old', done: false, createdAt: 3 })).toEqual(cookie('c2', 'Old', { createdAt: 3 }));
  });
});

describe('reading documents', () => {
  it('restores the id and fills missing or invalid fields', () => {
    expect(entityFromDoc('priorities', 'p1', { title: 'Run', category: 'chores', status: 'weird' })).toEqual({
      id: 'p1', title: 'Run', category: null, why: '', progress: '', status: 'active', adjust: null, createdAt: 0,
    });
    expect(entityFromDoc('cookies', 'c1', { text: 'Pay', done: 'yes' })).toEqual(cookie('c1', 'Pay', { createdAt: 0 }));
  });

  it('defaults settings for a brand-new user', () => {
    expect(settingsFromDoc(undefined, 'Europe/London')).toEqual({
      birthday: null, timeZone: 'Europe/London', notificationsOn: false, notificationTime: '08:30', closedQuarterKeys: [], lastReminderDate: null,
    });
    expect(settingsFromDoc({ birthday: '2002-05-01', lastReminderDate: '2026-10-07' }, 'UTC')).toMatchObject({ birthday: '2002-05-01', lastReminderDate: '2026-10-07' });
  });
});

describe('StateAssembler', () => {
  it('waits for the user document and every collection', () => {
    const a = new StateAssembler('UTC');
    a.setSettings({ birthday: '2002-05-01' });
    for (const c of ['cookies', 'priorities', 'projects', 'activity', 'backburner', 'quarterReviews'] as const) a.setCollection(c, []);
    expect(a.state()).toBeNull();
    a.setCollection('quotes', []);
    expect(a.state()?.settings.birthday).toBe('2002-05-01');
  });
});
