import { addIdea, ideasNewestFirst, removeIdea } from '../../domain/backburner';
import { AddRow } from '../components/AddRow';
import { SectionHeader } from '../components/SectionHeader';
import { plural } from '../format';
import { usePlanner } from '../PlannerContext';

export function Backburner({ onPromote }: { onPromote: (ideaId: string) => void }) {
  const { state, run, ctx } = usePlanner();
  const ideas = ideasNewestFirst(state);
  return (
    <section className="section" aria-label="Backburner">
      <SectionHeader title="Backburner" meta={plural(ideas.length, 'idea', 'ideas')} />
      <div className="list">
        {ideas.map(i => (
          <div key={i.id} className="idea-row">
            <span className="idea-text">{i.text}</span>
            <button className="idea-promote" onClick={() => onPromote(i.id)} aria-label={`Make "${i.text}" a priority`}>Prioritise</button>
            <button className="idea-remove" onClick={() => run(removeIdea(state, i.id))} aria-label={`Drop "${i.text}"`}>×</button>
          </div>
        ))}
        <AddRow placeholder="An idea to think on…" label="New idea" onAdd={text => run(addIdea(text, ctx()))} />
      </div>
    </section>
  );
}
