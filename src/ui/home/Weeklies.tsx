import { addWeekly, isDoneThisWeek, nextReset, orderedWeeklies, removeWeekly, toggleWeekly, weeklySummary } from '../../domain/weeklies';
import { AddRow } from '../components/AddRow';
import { SectionHeader } from '../components/SectionHeader';
import { monthDay } from '../format';
import { usePlanner } from '../PlannerContext';

/** A recurring checklist; the ticks clear every Monday. */
export function Weeklies() {
  const { state, run, ctx, today } = usePlanner();
  const { done, total } = weeklySummary(state, today);
  return (
    <section className="section" aria-label="Weeklies">
      <SectionHeader title="Weeklies" meta={`${done} of ${total}`} />
      <div className="list">
        {orderedWeeklies(state).map(w => {
          const on = isDoneThisWeek(w, today);
          return (
            <div key={w.id} className="weekly-row">
              <button className="cookie-row weekly-check" role="checkbox" aria-checked={on} onClick={() => run(toggleWeekly(state, w.id, ctx()))}>
                <span className={`checkbox${on ? ' is-on' : ''}`} aria-hidden="true" />
                <span className={`cookie-text${on ? ' is-done' : ''}`}>{w.text}</span>
              </button>
              <button className="idea-remove" onClick={() => run(removeWeekly(state, w.id))} aria-label={`Remove ${w.text}`}>×</button>
            </div>
          );
        })}
        <AddRow placeholder="Something to do every week…" label="New weekly" onAdd={text => run(addWeekly(text, ctx()))} />
      </div>
      <span className="hint hint--faint">Resets Monday, {monthDay(nextReset(today))}</span>
    </section>
  );
}
