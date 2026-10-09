import { addGoal, goalSummary, orderedGoals, removeGoal, toggleGoal } from '../../domain/goals';
import { AddRow } from '../components/AddRow';
import { SectionHeader } from '../components/SectionHeader';
import { usePlanner } from '../PlannerContext';

/** The big things being worked toward; ticking one marks it achieved. */
export function Goals() {
  const { state, run, ctx } = usePlanner();
  const { done, total } = goalSummary(state);
  return (
    <section className="section" aria-label="Major goals">
      <SectionHeader title="Major goals" meta={`${done} of ${total}`} />
      <div className="list">
        {orderedGoals(state).map(g => (
          <div key={g.id} className="weekly-row">
            <button className="cookie-row weekly-check" role="checkbox" aria-checked={g.done} onClick={() => run(toggleGoal(state, g.id, ctx()))}>
              <span className={`checkbox${g.done ? ' is-on' : ''}`} aria-hidden="true" />
              <span className={`cookie-text${g.done ? ' is-done' : ''}`}>{g.text}</span>
            </button>
            <button className="idea-remove" onClick={() => run(removeGoal(state, g.id))} aria-label={`Remove ${g.text}`}>×</button>
          </div>
        ))}
        <AddRow placeholder="Something big you are working toward…" label="New major goal" onAdd={text => run(addGoal(text, ctx()))} />
      </div>
    </section>
  );
}
