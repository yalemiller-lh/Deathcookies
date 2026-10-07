import type { Quarter, QuarterProgress } from '../../domain/dates';
import { quoteFor } from '../../domain/quotes';
import { weekdayMonthDay, weekLine } from '../format';

export function Header({ quarter, progress, today }: { quarter: Quarter; progress: QuarterProgress; today: Date }) {
  const quote = quoteFor(today);
  return (
    <>
      <header>
        <div className="eyebrow">Year {quarter.yearNumber} · Quarter {quarter.index + 1}</div>
        <h1 className="h1">{weekdayMonthDay(today)}</h1>
        <div className="week-line">{weekLine(progress)}</div>
      </header>
      <figure className="quote">
        <p>“{quote.text}”</p>
        <figcaption className="quote-by">— {quote.by}</figcaption>
      </figure>
    </>
  );
}
