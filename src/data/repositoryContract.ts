// Behaviour every PlannerRepository must have. Run against each adapter.
import { expect, it } from 'vitest';
import { patchSettings, put, remove } from '../domain/changes';
import type { PlannerState } from '../domain/model';
import type { PlannerRepository } from './repository';
import { cookie } from '../test/fixtures';

function latest(repo: PlannerRepository) {
  const seen: PlannerState[] = [];
  const unsubscribe = repo.subscribe(s => seen.push(s));
  return { seen, unsubscribe, get last() { return seen.at(-1)!; } };
}

export function repositoryContract(makeRepo: () => PlannerRepository) {
  it('delivers the current state to a new subscriber', () => {
    const sub = latest(makeRepo());
    expect(sub.seen.length).toBe(1);
    expect(sub.last.cookies).toEqual([]);
  });

  it('applies puts, deletes and settings patches together', async () => {
    const repo = makeRepo();
    const sub = latest(repo);
    await repo.apply([
      put('cookies', cookie('c1', 'One', { createdAt: 1 })),
      put('cookies', cookie('c2', 'Two', { createdAt: 2 })),
      patchSettings({ notificationsOn: true }),
    ]);
    await repo.apply([remove('cookies', 'c1'), put('cookies', cookie('c2', 'Two', { createdAt: 2, done: true, completedAt: 5 }))]);
    expect(sub.last.cookies).toEqual([cookie('c2', 'Two', { createdAt: 2, done: true, completedAt: 5 })]);
    expect(sub.last.settings.notificationsOn).toBe(true);
  });

  it('stops notifying after unsubscribe', async () => {
    const repo = makeRepo();
    const sub = latest(repo);
    sub.unsubscribe();
    const before = sub.seen.length;
    await repo.apply([put('weeklies', { id: 'w1', text: 'Call Nan', doneWeek: null, createdAt: 1 })]);
    expect(sub.seen.length).toBe(before);
  });
}
