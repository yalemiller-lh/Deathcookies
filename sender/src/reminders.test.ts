import { describe, expect, it } from 'vitest';
import type { Cookie } from '../../src/domain/model';
import { sendDueReminders, sendToUser, type PushSender, type ReminderStore, type ReminderUser, type SendResult, type StoredSubscription } from './reminders';

function fakeStore(users: ReminderUser[], data: Record<string, { cookies: Cookie[]; subs: StoredSubscription[] }>) {
  const marked: Record<string, string> = {};
  const removed: string[] = [];
  const store: ReminderStore = {
    usersWithRemindersOn: async () => users.filter(u => u.settings.notificationsOn),
    cookies: async uid => data[uid]?.cookies ?? [],
    subscriptions: async uid => (data[uid]?.subs ?? []).filter(s => !removed.includes(s.id)),
    markSent: async (uid, date) => { marked[uid] = date; },
    removeSubscription: async (_uid, id) => { removed.push(id); },
  };
  return { store, marked, removed };
}

function fakeSender(results: Record<string, SendResult> = {}) {
  const sent: { endpoint: string; title: string; body: string }[] = [];
  const sender: PushSender = {
    send: async (s, m) => { sent.push({ endpoint: s.endpoint, ...m }); return results[s.id] ?? 'sent'; },
  };
  return { sender, sent };
}

const sub = (id: string): StoredSubscription => ({ id, endpoint: `https://push.example/${id}`, keys: { p256dh: 'p', auth: 'a' } });
const user = (uid: string, patch: Partial<ReminderUser> = {}): ReminderUser => ({
  uid, lastReminderDate: null, settings: { notificationsOn: true, notificationTime: '08:30', timeZone: 'UTC' }, ...patch,
});
const cookies: Cookie[] = [{ id: 'c1', text: 'Pay the deposit', done: false, createdAt: 1 }, { id: 'c2', text: 'Renew tax', done: false, createdAt: 2 }];
const at830 = new Date('2026-10-07T08:30:00Z');

describe('sendDueReminders', () => {
  it('sends the reminder to every device of a due user and records the day', async () => {
    const { store, marked } = fakeStore([user('u1')], { u1: { cookies, subs: [sub('phone'), sub('laptop')] } });
    const { sender, sent } = fakeSender();
    const report = await sendDueReminders(store, sender, at830);
    expect(report).toEqual({ due: 1, sent: 2, removed: 0, failed: 0, errors: 0 });
    expect(sent[0]).toMatchObject({ title: '2 deathcookies to eat', body: 'Start with: Pay the deposit' });
    expect(marked).toEqual({ u1: '2026-10-07' });
  });

  it('skips users who are not due or already reminded today', async () => {
    const { store } = fakeStore(
      [user('early', { settings: { notificationsOn: true, notificationTime: '09:00', timeZone: 'UTC' } }), user('done', { lastReminderDate: '2026-10-07' })],
      { early: { cookies, subs: [sub('a')] }, done: { cookies, subs: [sub('b')] } },
    );
    const { sender, sent } = fakeSender();
    expect((await sendDueReminders(store, sender, at830)).due).toBe(0);
    expect(sent).toEqual([]);
  });

  it('removes subscriptions the browser has dropped', async () => {
    const { store, removed, marked } = fakeStore([user('u1')], { u1: { cookies, subs: [sub('old'), sub('new')] } });
    const { sender } = fakeSender({ old: 'gone' });
    const report = await sendDueReminders(store, sender, at830);
    expect(report).toMatchObject({ sent: 1, removed: 1 });
    expect(removed).toEqual(['old']);
    expect(marked.u1).toBe('2026-10-07');
  });

  it('leaves the day open for a retry when every send failed', async () => {
    const { store, marked } = fakeStore([user('u1')], { u1: { cookies, subs: [sub('a')] } });
    const { sender } = fakeSender({ a: 'failed' });
    expect((await sendDueReminders(store, sender, at830)).failed).toBe(1);
    expect(marked).toEqual({});
  });

  it('keeps going when one user errors', async () => {
    const { store, marked } = fakeStore([user('bad'), user('good')], { good: { cookies, subs: [sub('g')] } });
    store.cookies = async uid => { if (uid === 'bad') throw new Error('boom'); return cookies; };
    const { sender } = fakeSender();
    const report = await sendDueReminders(store, sender, at830);
    expect(report).toMatchObject({ errors: 1, sent: 1 });
    expect(marked).toEqual({ good: '2026-10-07' });
  });
});

describe('sendToUser', () => {
  it('sends the clean-plate message when nothing is open', async () => {
    const { store } = fakeStore([], { u1: { cookies: [{ ...cookies[0]!, done: true }], subs: [sub('a')] } });
    const { sender, sent } = fakeSender();
    await sendToUser(store, sender, 'u1');
    expect(sent[0]?.title).toBe('No deathcookies today');
  });
});
