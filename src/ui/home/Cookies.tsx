import { addCookie, clearDoneCookies, openCookies, toggleCookie } from '../../domain/cookies';
import { ordered } from '../../domain/model';
import { AddRow } from '../components/AddRow';
import { SectionHeader } from '../components/SectionHeader';
import { usePlanner } from '../PlannerContext';

export function Cookies() {
  const { state, run, ctx } = usePlanner();
  const cookies = ordered(state.cookies);
  return (
    <section className="section" aria-label="Deathcookies">
      <SectionHeader title="Deathcookies" meta={`${openCookies(cookies).length} open`} />
      <div className="list">
        {cookies.map(c => (
          <button key={c.id} className="cookie-row" role="checkbox" aria-checked={c.done} onClick={() => run(toggleCookie(state, c.id))}>
            <span className={`checkbox${c.done ? ' is-on' : ''}`} aria-hidden="true" />
            <span className={`cookie-text${c.done ? ' is-done' : ''}`}>{c.text}</span>
          </button>
        ))}
        <AddRow placeholder="Something that cannot wait…" label="New deathcookie" onAdd={text => run(addCookie(text, ctx()))} />
      </div>
      {cookies.some(c => c.done) && (
        <div><button className="text-btn text-btn--start" onClick={() => run(clearDoneCookies(state))}>Clear the done ones</button></div>
      )}
    </section>
  );
}
