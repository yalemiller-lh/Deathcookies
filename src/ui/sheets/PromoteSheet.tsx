import { useEffect } from 'react';
import { promoteIdea } from '../../domain/backburner';
import { activePriorities } from '../../domain/priorities';
import { Sheet } from '../components/Sheet';
import { numeral } from '../format';
import { usePlanner } from '../PlannerContext';

/** "Change focus now": bring a backburner idea in as a priority. */
export function PromoteSheet({ ideaId, onClose, onPromoted }: { ideaId: string; onClose: () => void; onPromoted: (priorityId: string, title: string) => void }) {
  const { state, run, ctx } = usePlanner();
  const idea = state.backburner.find(i => i.id === ideaId);
  const active = activePriorities(state);
  const hasRoom = active.length < 3;
  useEffect(() => { if (!idea) onClose(); }, [idea, onClose]);
  if (!idea) return null;

  const promote = (setAsideId: string | null) => {
    const out = promoteIdea(state, ideaId, setAsideId, ctx());
    if (!out.ok) return;
    run(out.changes);
    onPromoted(out.priorityId, idea.text);
  };

  return (
    <Sheet onClose={onClose}>
      {titleId => (
        <>
          <div className="eyebrow">Change focus now</div>
          <h2 id={titleId} className="sheet-title">{idea.text}</h2>
          {hasRoom ? (
            <>
              <p className="muted">There is room for one more priority this quarter. You can write down why it matters once it is in.</p>
              <button className="btn-primary full tall" onClick={() => promote(null)}>Add as priority {numeral(active.length)}</button>
            </>
          ) : (
            <>
              <p className="muted">You are already holding three. To take this on now, set one aside. It keeps its notes and can come back at any review.</p>
              <div className="stack-8">
                {active.map(p => (
                  <button key={p.id} className="choice" onClick={() => promote(p.id)}>
                    <span className="choice-title">{p.title}</span>
                    <span className="section-meta">Set aside</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <button className="btn-outline full" onClick={onClose}>Not now, keep it here</button>
        </>
      )}
    </Sheet>
  );
}
