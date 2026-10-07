import { describe, expect, it, vi } from 'vitest';
import { captureIncomingQuote, incomingQuote } from './incomingQuote';

const at = (hash: string) => ({ hash, pathname: '/', search: '' }) as Location;

describe('incoming quote', () => {
  it('moves a quote from the link into storage, cleans the address, and keeps it until cleared', () => {
    sessionStorage.clear();
    const history = { replaceState: vi.fn() } as unknown as History;
    captureIncomingQuote(at('#quote=' + encodeURIComponent('9:41\n“Well begun is half done.”\n— Aristotle')), history, sessionStorage);
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/');
    const waiting = incomingQuote(sessionStorage);
    expect(waiting.peek()).toEqual({ text: 'Well begun is half done.', by: 'Aristotle' });
    expect(waiting.peek()).toEqual({ text: 'Well begun is half done.', by: 'Aristotle' });
    waiting.clear();
    expect(waiting.peek()).toBeNull();
  });

  it('uses an author given separately', () => {
    sessionStorage.clear();
    captureIncomingQuote(at('#quote=Be%20one.&by=Marcus%20Aurelius'), { replaceState: () => {} } as unknown as History, sessionStorage);
    expect(incomingQuote(sessionStorage).peek()).toEqual({ text: 'Be one.', by: 'Marcus Aurelius' });
  });

  it('notices a quote that arrives while the app is open', async () => {
    sessionStorage.clear();
    const arrived = vi.fn();
    const stop = incomingQuote(sessionStorage).onArrive(arrived);
    window.location.hash = '#quote=' + encodeURIComponent('Be one.');
    await new Promise(r => setTimeout(r, 20));
    expect(arrived).toHaveBeenCalledTimes(1);
    expect(incomingQuote(sessionStorage).peek()).toEqual({ text: 'Be one.', by: '' });
    expect(window.location.hash).toBe('');
    stop();
  });

  it('leaves ordinary links alone', () => {
    sessionStorage.clear();
    const history = { replaceState: vi.fn() } as unknown as History;
    captureIncomingQuote(at(''), history, sessionStorage);
    expect(history.replaceState).not.toHaveBeenCalled();
    expect(incomingQuote(sessionStorage).peek()).toBeNull();
  });
});
