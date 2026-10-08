import { describe, expect, it, vi } from 'vitest';
import { httpReminderService } from './reminderService';

const respond = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe('httpReminderService', () => {
  it('posts to /test with the sign-in token and returns the report', async () => {
    const fetchFn = respond(200, { sent: 2, failed: 0, removed: 1 });
    const report = await httpReminderService('https://worker.example/', async () => 'tok', fetchFn).sendTest();
    expect(report).toEqual({ sent: 2, failed: 0, removed: 1 });
    expect(fetchFn).toHaveBeenCalledWith('https://worker.example/test', { method: 'POST', headers: { Authorization: 'Bearer tok' } });
  });

  it('explains refusals and needs a signed-in person', async () => {
    await expect(httpReminderService('https://w', async () => 'tok', respond(401, { error: 'not signed in: token expired' })).sendTest()).rejects.toThrow('token expired');
    await expect(httpReminderService('https://w', async () => null, respond(200, {})).sendTest()).rejects.toThrow('Sign in first.');
  });
});
