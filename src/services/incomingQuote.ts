// A quote handed to the app in its link (#quote=…&by=…), as the iOS Shortcut
// does. The text sits after the # so it never reaches a server. It is moved
// into session storage at start-up, so it survives signing in first, and
// stays there until the Quotes sheet that shows it is closed.
import { parseQuoteText } from '../domain/quoteText';
import type { Quote } from '../domain/quotes';
import type { Unsubscribe } from '../data/repository';

const KEY = 'deathcookies:incoming-quote';

export interface IncomingQuote {
  /** The waiting quote, split into text and author, or null. Reading does not remove it. */
  peek(): Quote | null;
  clear(): void;
  /** Calls back when a quote arrives while the app is already open (only the # part of the link changed). */
  onArrive(listener: () => void): Unsubscribe;
}

/** Moves a quote from the address into session storage and tidies the address bar. */
export function captureIncomingQuote(location: Location = window.location, history: History = window.history, storage: Storage = sessionStorage): void {
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));
  const text = params.get('quote');
  if (text === null) return;
  try { storage.setItem(KEY, JSON.stringify({ text, by: params.get('by') ?? '' })); } catch { /* storage blocked: nothing to keep */ }
  history.replaceState(null, '', location.pathname + location.search);
}

export function incomingQuote(storage: Storage = sessionStorage, win: Window = window): IncomingQuote {
  const self: IncomingQuote = {
    peek() {
      try {
        const raw = storage.getItem(KEY);
        if (!raw) return null;
        const { text, by } = JSON.parse(raw) as { text?: unknown; by?: unknown };
        if (typeof text !== 'string') return null;
        // An author given separately wins; otherwise guess it from the text.
        if (typeof by === 'string' && by.trim()) return { text, by };
        return parseQuoteText(text);
      } catch {
        return null;
      }
    },
    clear() {
      try { storage.removeItem(KEY); } catch { /* storage blocked */ }
    },
    onArrive(listener) {
      const onHash = () => {
        captureIncomingQuote(win.location, win.history, storage);
        if (self.peek()) listener();
      };
      win.addEventListener('hashchange', onHash);
      return () => win.removeEventListener('hashchange', onHash);
    },
  };
  return self;
}

/** For screens and tests with nothing waiting. */
export const noIncomingQuote: IncomingQuote = { peek: () => null, clear: () => {}, onArrive: () => () => {} };
