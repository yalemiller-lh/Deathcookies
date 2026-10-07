// Quotes: the person's saved quotes, and which one is the quote of the day.
import { daysBetween } from './dates';
import { put, remove, type Change, type Outcome } from './changes';
import { ordered, type CommandContext, type PlannerState, type SavedQuote } from './model';
import { cleanAuthor, cleanQuoteText } from './quoteText';

export interface Quote {
  text: string;
  by: string;
}

/** Shown only until the person has saved a quote of their own. */
export const CLASSICS: readonly Quote[] = [
  { text: 'Begin at once to live, and count each separate day as a separate life.', by: 'Seneca' },
  { text: 'Waste no more time arguing about what a good man should be. Be one.', by: 'Marcus Aurelius' },
  { text: 'First say to yourself what you would be; and then do what you have to do.', by: 'Epictetus' },
  { text: 'Do not wait to strike till the iron is hot; but make it hot by striking.', by: 'W. B. Yeats' },
  { text: 'He who has a why to live can bear almost any how.', by: 'Friedrich Nietzsche' },
  { text: 'Little by little, one travels far.', by: 'Proverb' },
  { text: 'No one ever steps in the same river twice.', by: 'Heraclitus' },
  { text: 'Well begun is half done.', by: 'Aristotle' },
];

/** Days since a fixed start, so the rotation runs on across New Year. */
const dayNumber = (today: Date) => daysBetween(new Date(2000, 0, 1), today);

/** One quote a day, in turn: from the saved quotes only, or the classics while there are none. */
export function quoteOfTheDay(today: Date, saved: readonly SavedQuote[]): Quote {
  const pool: readonly Quote[] = saved.length > 0 ? ordered(saved) : CLASSICS;
  const q = pool[dayNumber(today) % pool.length]!;
  return { text: q.text, by: q.by };
}

/** Saved quotes, newest first, as the Quotes list shows them. */
export function quotesNewestFirst(state: PlannerState): SavedQuote[] {
  return [...state.quotes].sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
}

export type QuoteError = 'text-required' | 'not-found';

export function addQuote(input: Quote, ctx: CommandContext): Outcome<QuoteError> {
  const text = cleanQuoteText(input.text);
  if (!text) return { ok: false, error: 'text-required' };
  return { ok: true, changes: [put('quotes', { id: ctx.newId(), text, by: cleanAuthor(input.by), createdAt: ctx.now.getTime() })] };
}

export function updateQuote(state: PlannerState, id: string, input: Quote): Outcome<QuoteError> {
  const existing = state.quotes.find(q => q.id === id);
  if (!existing) return { ok: false, error: 'not-found' };
  const text = cleanQuoteText(input.text);
  if (!text) return { ok: false, error: 'text-required' };
  return { ok: true, changes: [put('quotes', { ...existing, text, by: cleanAuthor(input.by) })] };
}

export function removeQuote(state: PlannerState, id: string): Change[] {
  return state.quotes.some(q => q.id === id) ? [remove('quotes', id)] : [];
}
