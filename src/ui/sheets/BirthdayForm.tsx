import { useState } from 'react';
import { quarterOn } from '../../domain/dates';
import { checkBirthday, setBirthday } from '../../domain/settings';
import { monthDay, monthDayYear } from '../format';
import { usePlanner } from '../PlannerContext';

/** Date input with a live preview of the year and quarter it puts today in. */
export function BirthdayForm({ onSaved, onCancel }: { onSaved: () => void; onCancel?: () => void }) {
  const { state, run, today } = usePlanner();
  const [draft, setDraft] = useState(state.settings.birthday ?? '');
  const error = checkBirthday(draft, today);

  let preview = 'Enter a date to see your current year and quarter.';
  if (error === 'future') preview = 'That date has not happened yet.';
  if (!error) {
    const q = quarterOn(draft, today);
    preview = `Today falls in Year ${q.yearNumber} · Quarter ${q.index + 1} · ${monthDay(q.start)} – ${monthDayYear(q.end)}`;
  }

  const save = () => {
    const out = setBirthday(state, draft, today);
    if (!out.ok) return;
    run(out.changes);
    onSaved();
  };

  return (
    <>
      <input type="date" className="input input--date" value={draft} onChange={e => setDraft(e.target.value)} aria-label="Birthday" />
      <div className="preview-box" aria-live="polite">{preview}</div>
      <div className="btn-row">
        <button className="btn-primary" disabled={!!error} onClick={save}>Save</button>
        {onCancel && <button className="btn-outline btn-outline--tall" onClick={onCancel}>Cancel</button>}
      </div>
    </>
  );
}
