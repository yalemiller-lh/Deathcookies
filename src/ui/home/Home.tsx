import { useCallback, useEffect, useState } from 'react';
import { quarterOn, quarterProgress } from '../../domain/dates';
import { quoteOfTheDay, type Quote } from '../../domain/quotes';
import { TabBar, type Tab } from '../components/TabBar';
import { usePlanner } from '../PlannerContext';
import { RejectionTherapy } from '../rejection/RejectionTherapy';
import { BirthdaySheet } from '../sheets/BirthdaySheet';
import { QuotesSheet } from '../sheets/QuotesSheet';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { Cookies } from './Cookies';
import { Header } from './Header';
import { Weeklies } from './Weeklies';

type OpenSheet = { kind: 'birthday' } | { kind: 'settings' } | { kind: 'quotes'; incoming: Quote | null } | null;

/** The signed-in app: the Today and Rejection Therapy tabs, and the sheets over them. Requires a birthday (see Onboarding). */
export function Home() {
  const { state, today, services } = usePlanner();
  const [tab, setTab] = useState<Tab>('today');
  // A quote sent from the iOS Shortcut opens straight into the Quotes sheet…
  const [sheet, setSheet] = useState<OpenSheet>(() => {
    const incoming = services.incomingQuote.peek();
    return incoming ? { kind: 'quotes', incoming } : null;
  });
  const closeSheet = useCallback(() => setSheet(null), []);
  const closeQuotes = useCallback(() => { services.incomingQuote.clear(); setSheet(null); }, [services]);
  // …and so does one that arrives while the app is already open.
  useEffect(() => services.incomingQuote.onArrive(() => {
    const incoming = services.incomingQuote.peek();
    if (incoming) setSheet({ kind: 'quotes', incoming });
  }), [services]);

  const switchTab = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };
  const quarter = quarterOn(state.settings.birthday!, today);

  return (
    <main className="page page--tabs">
      {tab === 'today' ? (
        <div className="column">
          <Header quarter={quarter} progress={quarterProgress(quarter, today)} today={today} quote={quoteOfTheDay(today, state.quotes)} onOpenQuotes={() => setSheet({ kind: 'quotes', incoming: null })} />
          <Cookies />
          <Weeklies />
          <footer className="footer">
            <button className="text-btn" onClick={() => setSheet({ kind: 'quotes', incoming: null })}>Quotes</button>
            <button className="text-btn" onClick={() => setSheet({ kind: 'settings' })}>Settings</button>
          </footer>
        </div>
      ) : (
        <RejectionTherapy />
      )}
      <TabBar tab={tab} onChange={switchTab} />

      {sheet?.kind === 'birthday' && <BirthdaySheet onClose={closeSheet} />}
      {sheet?.kind === 'quotes' && <QuotesSheet key={sheet.incoming?.text ?? 'list'} incoming={sheet.incoming} onClose={closeQuotes} />}
      {sheet?.kind === 'settings' && <SettingsSheet onClose={closeSheet} onChangeBirthday={() => setSheet({ kind: 'birthday' })} />}
    </main>
  );
}
