import { useCallback, useEffect, useState } from 'react';
import { isReviewWindowOpen, quarterProgress, workingQuarter } from '../../domain/dates';
import type { ReviewDrafts } from '../../domain/quarterReview';
import { quoteOfTheDay, type Quote } from '../../domain/quotes';
import { HINTS, weekdayMonthDay } from '../format';
import { usePlanner } from '../PlannerContext';
import { BirthdaySheet } from '../sheets/BirthdaySheet';
import { PromoteSheet } from '../sheets/PromoteSheet';
import { QuotesSheet } from '../sheets/QuotesSheet';
import { QuarterReviewSheet, type ClosedNotice } from '../sheets/QuarterReviewSheet';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { Backburner } from './Backburner';
import { Cookies } from './Cookies';
import { Header } from './Header';
import { Priorities } from './Priorities';
import type { Editing } from './PriorityEditor';
import { SetAside } from './SetAside';

type OpenSheet = { kind: 'promote'; ideaId: string } | { kind: 'review' } | { kind: 'birthday' } | { kind: 'settings' } | { kind: 'quotes'; incoming: Quote | null } | null;

/** The one screen. Requires a birthday (see Onboarding). */
export function Home() {
  const { state, today, services } = usePlanner();
  // A quote sent from the iOS Shortcut opens straight into the Quotes sheet.
  const [sheet, setSheet] = useState<OpenSheet>(() => {
    const incoming = services.incomingQuote.peek();
    return incoming ? { kind: 'quotes', incoming } : null;
  });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<ReviewDrafts>({});
  const [closedNotice, setClosedNotice] = useState<ClosedNotice | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);
  const closeQuotes = useCallback(() => { services.incomingQuote.clear(); setSheet(null); }, [services]);
  // …and so does one that arrives while the app is already open.
  useEffect(() => services.incomingQuote.onArrive(() => {
    const incoming = services.incomingQuote.peek();
    if (incoming) setSheet({ kind: 'quotes', incoming });
  }), [services]);

  const quarter = workingQuarter(state.settings.birthday!, today, state.settings.closedQuarterKeys);
  const progress = quarterProgress(quarter, today);
  const reviewOpen = isReviewWindowOpen(quarter, today);

  const promoted = (priorityId: string, title: string) => {
    setSheet(null);
    setEditing({ key: priorityId, hint: HINTS.afterPromote, reveal: true, draft: { id: priorityId, title, category: null, why: '', progress: '', projectIds: [] } });
  };
  const quarterClosed = (notice: ClosedNotice) => {
    setSheet(null);
    setReviewDrafts({});
    setClosedNotice(notice);
    window.scrollTo({ top: 0 });
  };

  return (
    <main className="page">
      <div className="column">
        <Header quarter={quarter} progress={progress} today={today} quote={quoteOfTheDay(today, state.quotes)} onOpenQuotes={() => setSheet({ kind: 'quotes', incoming: null })} />
        <Cookies />
        {closedNotice && (
          <div className="notice" role="status">
            <div className="notice-title">{closedNotice.title}</div>
            <div className="notice-body">{closedNotice.body}</div>
            <div><button className="text-btn text-btn--start text-btn--strong" onClick={() => setClosedNotice(null)}>Okay</button></div>
          </div>
        )}
        {reviewOpen && (
          <button className="review-card" onClick={() => setSheet({ kind: 'review' })}>
            <span className="review-card-title">
              Quarter {quarter.index + 1} closes {progress.daysLeft === 0 ? 'today' : weekdayMonthDay(quarter.end)}
            </span>
            <span className="notice-body">Look back over each priority and decide what to carry into the next quarter. Ready when you are.</span>
            <span className="review-card-cta">Begin the quarter review →</span>
          </button>
        )}
        <Priorities editing={editing} setEditing={setEditing} />
        <Backburner onPromote={ideaId => setSheet({ kind: 'promote', ideaId })} />
        <SetAside />
        <footer className="footer">
          <button className="text-btn" onClick={() => setSheet({ kind: 'quotes', incoming: null })}>Quotes</button>
          <button className="text-btn" onClick={() => setSheet({ kind: 'settings' })}>Settings</button>
        </footer>
      </div>

      {sheet?.kind === 'promote' && <PromoteSheet ideaId={sheet.ideaId} onClose={closeSheet} onPromoted={promoted} />}
      {sheet?.kind === 'review' && (
        <QuarterReviewSheet quarter={quarter} drafts={reviewDrafts} setDrafts={setReviewDrafts} onClose={closeSheet} onClosed={quarterClosed} />
      )}
      {sheet?.kind === 'birthday' && <BirthdaySheet onClose={closeSheet} />}
      {sheet?.kind === 'quotes' && <QuotesSheet key={sheet.incoming?.text ?? 'list'} incoming={sheet.incoming} onClose={closeQuotes} />}
      {sheet?.kind === 'settings' && <SettingsSheet onClose={closeSheet} onChangeBirthday={() => setSheet({ kind: 'birthday' })} />}
    </main>
  );
}
