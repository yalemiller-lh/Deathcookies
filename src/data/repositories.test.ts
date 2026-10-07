import { describe, expect, it } from 'vitest';
import { put } from '../domain/changes';
import { emptyState } from '../domain/model';
import { localRepository } from './localRepository';
import { memoryRepository } from './memoryRepository';
import { repositoryContract } from './repositoryContract';
import { cookie } from '../test/fixtures';

describe('memoryRepository', () => {
  repositoryContract(() => memoryRepository(emptyState('UTC')));
});

describe('localRepository', () => {
  repositoryContract(() => { localStorage.clear(); return localRepository(localStorage, 'UTC'); });

  it('keeps data across reloads', async () => {
    localStorage.clear();
    await localRepository(localStorage, 'UTC').apply([put('cookies', cookie('c1', 'Kept'))]);
    let cookies: unknown[] = [];
    localRepository(localStorage, 'UTC').subscribe(s => { cookies = s.cookies; });
    expect(cookies).toEqual([cookie('c1', 'Kept')]);
  });

  it('starts fresh when saved data is unreadable', () => {
    localStorage.setItem('deathcookies:v1', '{not json');
    let birthday: string | null = 'x';
    localRepository(localStorage, 'Europe/London').subscribe(s => { birthday = s.settings.birthday; });
    expect(birthday).toBeNull();
  });
});
