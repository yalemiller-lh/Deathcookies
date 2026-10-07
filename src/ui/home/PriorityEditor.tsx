import { useEffect, useRef } from 'react';
import { CATEGORIES, ordered } from '../../domain/model';
import { pausePriority, savePriority, type PriorityDraft, type SavePriorityError } from '../../domain/priorities';
import { HINTS } from '../format';
import { usePlanner } from '../PlannerContext';

export interface Editing {
  /** The priority id, or 'new'. */
  key: string;
  draft: PriorityDraft;
  hint: string;
  /** Bring the editor into view when it opens (after promoting an idea). */
  reveal?: boolean;
}

const ERROR_HINTS: Record<SavePriorityError, string> = {
  'title-required': HINTS.titleRequired,
  'no-room': HINTS.noRoom,
  'not-found': HINTS.removedElsewhere,
};

export function PriorityEditor({ editing, onChange, onClose, onSaved }: {
  editing: Editing; onChange: (e: Editing) => void; onClose: () => void; onSaved: (priorityId: string) => void;
}) {
  const { state, run, ctx } = usePlanner();
  const { draft } = editing;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (editing.reveal) ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [editing.reveal]);

  const set = (patch: Partial<PriorityDraft>, hint = editing.hint) => onChange({ ...editing, hint, reveal: false, draft: { ...draft, ...patch } });
  const toggleProject = (id: string) => set({ projectIds: draft.projectIds.includes(id) ? draft.projectIds.filter(x => x !== id) : [...draft.projectIds, id] });
  const save = () => {
    const out = savePriority(state, draft, ctx());
    if (!out.ok) { onChange({ ...editing, hint: ERROR_HINTS[out.error] }); return; }
    run(out.changes);
    onSaved(out.priorityId);
  };
  const setAside = () => {
    if (draft.id) run(pausePriority(state, draft.id));
    onClose();
  };
  const projects = ordered(state.projects);

  return (
    <div ref={ref} className="card-stack editor">
      <input className="input input--title" value={draft.title} onChange={e => set({ title: e.target.value }, '')} placeholder="The priority, in one line" aria-label="Priority title" autoFocus={!editing.reveal} />
      <div className="field field--chips">
        <span className="label">Category</span>
        <div className="chips" role="radiogroup" aria-label="Category">
          {CATEGORIES.map(c => (
            <button key={c} role="radio" aria-checked={draft.category === c} className={`chip chip--category${draft.category === c ? ' is-on' : ''}`} onClick={() => set({ category: c })}>{c}</button>
          ))}
        </div>
      </div>
      <label className="field">
        <span className="label">Why it matters</span>
        <textarea className="input" rows={3} value={draft.why} onChange={e => set({ why: e.target.value })} placeholder="The reason you would give a friend" />
      </label>
      <label className="field">
        <span className="label">Progress would look like</span>
        <textarea className="input" rows={3} value={draft.progress} onChange={e => set({ progress: e.target.value })} placeholder="What you would notice by the end of the quarter" />
      </label>
      {projects.length > 0 && (
        <div className="field field--chips">
          <span className="label">Connected projects</span>
          <div className="chips">
            {projects.map(j => (
              <button key={j.id} aria-pressed={draft.projectIds.includes(j.id)} className={`chip${draft.projectIds.includes(j.id) ? ' is-on' : ''}`} onClick={() => toggleProject(j.id)}>{j.name}</button>
            ))}
          </div>
        </div>
      )}
      {editing.hint && <span className="hint" role="status">{editing.hint}</span>}
      <div className="btn-row">
        <button className="btn-primary" onClick={save}>Save</button>
        <button className="btn-outline btn-outline--tall" onClick={onClose}>Cancel</button>
        {draft.id !== null && (
          <button className="text-btn wide" onClick={setAside}>Set this one aside for now</button>
        )}
      </div>
    </div>
  );
}
