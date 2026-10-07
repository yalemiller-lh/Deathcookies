import { describe, expect, it, vi } from 'vitest';
import { liveBuild, watchForUpdates } from './updates';

const respond = (body: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => body }) as Response);
const flush = () => new Promise(r => setTimeout(r, 0));

describe('liveBuild', () => {
  it('reads the build id, and gives null when it cannot', async () => {
    expect(await liveBuild(respond({ build: '2026-10-07 20:00:00' }))).toBe('2026-10-07 20:00:00');
    expect(await liveBuild(respond({}, false))).toBeNull();
    expect(await liveBuild(vi.fn(async () => { throw new Error('offline'); }))).toBeNull();
  });
});

describe('watchForUpdates', () => {
  it('reports a newer build once', async () => {
    const onUpdate = vi.fn();
    const stop = watchForUpdates('old', respond({ build: 'new' }))(onUpdate);
    await flush();
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(onUpdate).toHaveBeenCalledTimes(1);
    stop();
  });

  it('stays quiet when the live build is this one', async () => {
    const onUpdate = vi.fn();
    const stop = watchForUpdates('same', respond({ build: 'same' }))(onUpdate);
    await flush();
    expect(onUpdate).not.toHaveBeenCalled();
    stop();
  });
});
