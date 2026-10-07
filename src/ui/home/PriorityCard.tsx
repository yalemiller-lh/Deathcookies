import { useState, type FormEvent } from 'react';
import type { Priority } from '../../domain/model';
import { addProject, logActivity, projectsFor, recentActivity } from '../../domain/projects';
import { activityLabel, numeral } from '../format';
import { usePlanner } from '../PlannerContext';

/** A priority in view mode: collapsed shows only tag and title. */
export function PriorityCard({ priority, index, expanded, onToggle, onEdit }: {
  priority: Priority; index: number; expanded: boolean; onToggle: () => void; onEdit: () => void;
}) {
  const { state, run, ctx, today } = usePlanner();
  const projects = projectsFor(state, priority.id);
  const [addingProject, setAddingProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [logText, setLogText] = useState('');

  const saveProject = (e: FormEvent) => {
    e.preventDefault();
    const changes = addProject(state, projectName, priority.id, ctx());
    if (changes.length === 0) return;
    run(changes);
    setProjectName('');
    setAddingProject(false);
  };
  const saveLog = (e: FormEvent) => {
    e.preventDefault();
    if (!loggingId) return;
    const changes = logActivity(state, loggingId, logText, ctx());
    if (changes.length === 0) return;
    run(changes);
    setLogText('');
    setLoggingId(null);
  };
  const startLog = (id: string) => { setLoggingId(id); setLogText(''); };

  return (
    <div className="card-stack">
      <button className="card-head" onClick={onToggle} aria-expanded={expanded}>
        <div className="card-head-main">
          <span className="numeral">{numeral(index)}</span>
          <div className="card-titles">
            {priority.category && <span className="tag">{priority.category}</span>}
            <h3 className="card-title">{priority.title}</h3>
          </div>
        </div>
        <span className={`chevron${expanded ? ' is-open' : ''}`} aria-hidden="true" />
      </button>

      {expanded && (
        <div className="card-body">
          {priority.adjust && (
            <div className="adjusted"><span className="adjusted-label">Adjusted</span><span>{priority.adjust}</span></div>
          )}
          {projects.map(j => {
            const last = recentActivity(state.activity, [j.id], today);
            const lastText = last ? activityLabel(last) : 'Quiet last week';
            return loggingId === j.id ? (
              <div key={j.id} className="project-log">
                <button className="project-name project-name-btn" onClick={() => setLoggingId(null)} aria-label={`Stop logging on ${j.name}`}>{j.name}</button>
                <form className="inline-form" onSubmit={saveLog}>
                  <input className="input" value={logText} onChange={e => setLogText(e.target.value)} placeholder="What happened?" aria-label={`Log something on ${j.name}`} autoFocus />
                  <button type="submit" className="btn-primary">Log</button>
                </form>
              </div>
            ) : (
              <button key={j.id} className="project" onClick={() => startLog(j.id)} aria-label={`${j.name}. ${lastText}. Log something`}>
                <span className="project-name">{j.name}</span>
                <span className={`project-last${last ? '' : ' is-quiet'}`}>{lastText}</span>
              </button>
            );
          })}
          {projects.length === 0 && !addingProject && <div className="empty-box">No projects connected yet.</div>}
          {addingProject && (
            <form className="inline-form" onSubmit={saveProject}>
              <input className="input" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Project name" aria-label="Project name" autoFocus />
              <button type="submit" className="btn-primary">Add</button>
            </form>
          )}
          <div>
            <div className="label">Why it matters</div>
            <p className="para">{priority.why || 'Not written yet.'}</p>
          </div>
          <div>
            <div className="label">Progress would look like</div>
            <p className="para">{priority.progress || 'Not written yet.'}</p>
          </div>
          <div className="card-foot">
            <button className="text-btn text-btn--start text-btn--strong" onClick={onEdit}>Edit</button>
            <button className="text-btn text-btn--end" onClick={() => { setAddingProject(a => !a); setProjectName(''); }}>
              {addingProject ? 'Cancel' : '+ Project'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
