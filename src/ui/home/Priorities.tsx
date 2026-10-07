import { useState } from 'react';
import type { Priority } from '../../domain/model';
import { MAX_ACTIVE_PRIORITIES } from '../../domain/model';
import { activePriorities, roomForPriorities } from '../../domain/priorities';
import { SectionHeader } from '../components/SectionHeader';
import { usePlanner } from '../PlannerContext';
import { PriorityCard } from './PriorityCard';
import { PriorityEditor, type Editing } from './PriorityEditor';

const blankDraft = { id: null, title: '', category: null, why: '', progress: '', projectIds: [] };

export function Priorities({ editing, setEditing }: { editing: Editing | null; setEditing: (e: Editing | null) => void }) {
  const { state } = usePlanner();
  const active = activePriorities(state);
  const room = roomForPriorities(state);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const edit = (p: Priority) => setEditing({
    key: p.id, hint: '',
    draft: { id: p.id, title: p.title, category: p.category, why: p.why, progress: p.progress, projectIds: state.projects.filter(j => j.priorityId === p.id).map(j => j.id) },
  });
  const saved = (id: string) => { setEditing(null); setExpanded(e => ({ ...e, [id]: true })); };
  const editor = (e: Editing) => <PriorityEditor editing={e} onChange={setEditing} onClose={() => setEditing(null)} onSaved={saved} />;

  return (
    <section className="section" aria-label="Priorities">
      <SectionHeader title="Priorities" meta={`${active.length} of ${MAX_ACTIVE_PRIORITIES}`} />
      {active.map((p, i) => (
        <article key={p.id} className="card">
          {editing?.key === p.id ? editor(editing) : (
            <PriorityCard priority={p} index={i} expanded={!!expanded[p.id]} onToggle={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))} onEdit={() => edit(p)} />
          )}
        </article>
      ))}
      {editing?.key === 'new' && <article className="card">{editor(editing)}</article>}
      {room > 0 && editing?.key !== 'new' && (
        <button className="dashed-btn" onClick={() => setEditing({ key: 'new', hint: '', draft: blankDraft })}>
          {active.length === 0 ? '+ First priority for this quarter' : `+ Priority · room for ${room} more`}
        </button>
      )}
    </section>
  );
}
