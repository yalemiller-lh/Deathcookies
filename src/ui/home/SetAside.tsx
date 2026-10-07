import { pausedPriorities, resumePriority, roomForPriorities } from '../../domain/priorities';
import { usePlanner } from '../PlannerContext';

export function SetAside() {
  const { state, run } = usePlanner();
  const paused = pausedPriorities(state);
  if (paused.length === 0) return null;
  const room = roomForPriorities(state) > 0;
  return (
    <section className="section" aria-label="Set aside">
      <div className="section-head section-head--left">
        <h2 className="section-title">Set aside</h2>
        <span className="section-aside">Kept, with their notes.</span>
      </div>
      {paused.map(p => (
        <div key={p.id} className="paused-row">
          <span className="paused-title">{p.title}</span>
          <button className="paused-action" disabled={!room} onClick={() => { const out = resumePriority(state, p.id); if (out.ok) run(out.changes); }}>
            {room ? 'Bring back' : 'No room yet'}
          </button>
        </div>
      ))}
    </section>
  );
}
