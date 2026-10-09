import type { FormEvent } from 'react';
import { parseISODate } from '../../domain/dates';
import { REJECTION_TOTAL } from '../../domain/model';
import { doneCards, logRejection, rejectionProgress } from '../../domain/rejections';
import { SectionHeader } from '../components/SectionHeader';
import { plural, shortDate } from '../format';
import { usePlanner } from '../PlannerContext';

/** 'No. 03'; card 100 is 'No. 100'. */
const cardLabel = (n: number) => `No. ${String(n).padStart(2, '0')}`;

/** The Rejection Therapy tab: 100 numbered cards, done one at a time. */
export function RejectionTherapy() {
  const { state, run, ctx } = usePlanner();
  const { done, current, percent } = rejectionProgress(state);
  const upcoming = current === null ? [] : Array.from({ length: REJECTION_TOTAL - current }, (_, i) => current + 1 + i);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(logRejection(state, ctx()));
  };

  return (
    <div className="column">
      <header>
        <div className="eyebrow">Rejection therapy</div>
        <h1 className="h1">{percent}%</h1>
        <div className="week-line">{current === null ? 'All one hundred' : `${plural(REJECTION_TOTAL - done, 'no', 'nos')} to go`}</div>
      </header>

      <section className="section" aria-label="100 rejections">
        <SectionHeader title="100 rejections" meta={`${done} done`} />
        {current !== null ? (
          <form className="rej-card" onSubmit={submit} aria-label={`Card ${cardLabel(current)}`}>
            <div className="rej-card-head">
              <span className="checkbox" aria-hidden="true" />
              <span className="rej-no rej-no--current">{cardLabel(current)}</span>
            </div>
            <button type="submit" className="btn-primary full">Submit</button>
          </form>
        ) : (
          <div className="notice" role="status">
            <div className="notice-title">A hundred no's.</div>
            <div className="notice-body">Every card is filled. They are all below.</div>
          </div>
        )}
        <div className="list" aria-label="All cards">
          {upcoming.map(n => (
            <div key={n} className="rej-row rej-row--upcoming">
              <span className="checkbox checkbox--dashed" aria-hidden="true" />
              <span className="rej-no rej-no--upcoming">{cardLabel(n)}</span>
            </div>
          ))}
          {doneCards(state).map(r => (
            <div key={r.id} className="rej-row rej-row--done">
              <span className="checkbox is-on" aria-hidden="true" />
              <div className="rej-done-line">
                <span className="rej-no">{cardLabel(r.n)}</span>
                <span className="rej-date">{shortDate(parseISODate(r.date))}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
