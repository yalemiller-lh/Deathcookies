import type { Quarter, QuarterProgress } from '../../domain/dates';
import type { Quote } from '../../domain/quotes';
import { weekdayMonthDay, weekLine } from '../format';

export function Header({ quarter, progress, today, quote, onOpenQuotes }: {
  quarter: Quarter; progress: QuarterProgress; today: Date; quote: Quote; onOpenQuotes: () => void;
}) {
  return (
    <>
      <header>
        <div className="eyebrow">Year {quarter.yearNumber} · Quarter {quarter.index + 1}</div>
        <h1 className="h1">{weekdayMonthDay(today)}</h1>
        <div className="week-line">{weekLine(progress)}</div>
      </header>
      {/* The day's quote; tapping it opens the saved quotes. */}
      <button className="quote" onClick={onOpenQuotes} aria-label={`Quote of the day: ${quote.text}${quote.by ? `, ${quote.by}` : ''}. Open your quotes`}>
        <span className="quote-text">“{quote.text}”</span>
        {quote.by && <span className="quote-by">— {quote.by}</span>}
      </button>
    </>
  );
}
