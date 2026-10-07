import { describe, expect, it } from 'vitest';
import { applyChanges } from './changes';
import { parseISODate } from './dates';
import { addQuote, CLASSICS, quoteOfTheDay, quotesNewestFirst, removeQuote, updateQuote } from './quotes';
import { parseQuoteText } from './quoteText';
import { stateWith, testContext } from '../test/fixtures';

const d = parseISODate;
const saved = (id: string, text: string, createdAt: number) => ({ id, text, by: 'Someone', createdAt });

describe('parseQuoteText', () => {
  it('splits a quote from a dashed author line', () => {
    expect(parseQuoteText('“Begin at once to live.”\n— Seneca')).toEqual({ text: 'Begin at once to live.', by: 'Seneca' });
  });

  it('drops status-bar clutter and rejoins wrapped lines', () => {
    const ocr = '9:41\n\n100%\n“Waste no more time arguing\nabout what a good man should be.\nBe one.”\n\n- Marcus Aurelius';
    expect(parseQuoteText(ocr)).toEqual({ text: 'Waste no more time arguing about what a good man should be. Be one.', by: 'Marcus Aurelius' });
  });

  it('ignores lines after the author, such as likes', () => {
    expect(parseQuoteText('"Well begun is half done."\n~ Aristotle,\n1,204 likes')).toEqual({ text: 'Well begun is half done.', by: 'Aristotle' });
  });

  it('takes a short last line after a closing quote mark as the author', () => {
    expect(parseQuoteText('“Little by little,\none travels far.”\nAfrican proverb')).toEqual({ text: 'Little by little, one travels far.', by: 'African proverb' });
  });

  it('leaves the author empty when there is none', () => {
    expect(parseQuoteText('No one ever steps in the same river twice.')).toEqual({ text: 'No one ever steps in the same river twice.', by: '' });
  });

  it('keeps a dash inside the quote', () => {
    expect(parseQuoteText('Do it now — later never comes.')).toEqual({ text: 'Do it now — later never comes.', by: '' });
  });
});

describe('saved quotes', () => {
  it('adds a tidied quote and requires text', () => {
    const out = addQuote({ text: '  “Make it hot by striking.” ', by: '— W. B. Yeats' }, testContext());
    if (!out.ok) throw new Error(out.error);
    const s = applyChanges(stateWith(), out.changes);
    expect(s.quotes).toMatchObject([{ text: 'Make it hot by striking.', by: 'W. B. Yeats' }]);
    expect(addQuote({ text: ' “” ', by: 'x' }, testContext())).toEqual({ ok: false, error: 'text-required' });
  });

  it('edits and removes', () => {
    const s0 = stateWith({ quotes: [saved('q1', 'Old', 1)] });
    const out = updateQuote(s0, 'q1', { text: 'New', by: 'Me' });
    if (!out.ok) throw new Error(out.error);
    const s1 = applyChanges(s0, out.changes);
    expect(s1.quotes[0]).toMatchObject({ id: 'q1', text: 'New', by: 'Me', createdAt: 1 });
    expect(updateQuote(s1, 'nope', { text: 'x', by: '' })).toEqual({ ok: false, error: 'not-found' });
    expect(applyChanges(s1, removeQuote(s1, 'q1')).quotes).toEqual([]);
  });

  it('lists newest first', () => {
    const s = stateWith({ quotes: [saved('a', 'A', 1), saved('b', 'B', 2)] });
    expect(quotesNewestFirst(s).map(q => q.id)).toEqual(['b', 'a']);
  });
});

describe('quoteOfTheDay', () => {
  it('uses only saved quotes once there are any, one a day in turn', () => {
    const quotes = [saved('a', 'A', 1), saved('b', 'B', 2), saved('c', 'C', 3)];
    const days = ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'].map(x => quoteOfTheDay(d(x), quotes).text);
    expect(new Set(days.slice(0, 3))).toEqual(new Set(['A', 'B', 'C']));
    expect(days[3]).toBe(days[0]);
    expect(CLASSICS.map(q => q.text)).not.toContain(days[0]);
  });

  it('carries on across New Year without restarting', () => {
    const quotes = [saved('a', 'A', 1), saved('b', 'B', 2)];
    expect(quoteOfTheDay(d('2026-12-31'), quotes).text).not.toBe(quoteOfTheDay(d('2027-01-01'), quotes).text);
  });

  it('falls back to the classics while nothing is saved', () => {
    expect(CLASSICS).toContainEqual(quoteOfTheDay(d('2026-10-07'), []));
  });
});
