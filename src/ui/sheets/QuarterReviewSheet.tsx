import type { Quarter } from '../../domain/dates';
import type { Decision } from '../../domain/model';
import { activePriorities } from '../../domain/priorities';
import { closeQuarter, reviewDraftFor, reviewSummary, type ReviewDraft, type ReviewDrafts } from '../../domain/quarterReview';
import { Sheet } from '../components/Sheet';
import { monthDay, plural, quarterRange } from '../format';
import { usePlanner } from '../PlannerContext';

const DECISIONS: Decision[] = ['continue', 'adjust', 'retire'];

export interface ClosedNotice {
  title: string;
  body: string;
}

export function QuarterReviewSheet({ quarter, drafts, setDrafts, onClose, onClosed }: {
  quarter: Quarter;
  drafts: ReviewDrafts;
  setDrafts: (d: ReviewDrafts) => void;
  onClose: () => void;
  onClosed: (notice: ClosedNotice) => void;
}) {
  const { state, run, ctx } = usePlanner();
  const active = activePriorities(state);
  const n = quarter.index + 1;
  const nextN = ((quarter.index + 1) % 4) + 1;
  const counts = reviewSummary(state, drafts);
  const update = (id: string, patch: Partial<ReviewDraft>) => setDrafts({ ...drafts, [id]: { ...drafts[id], ...patch } });

  const close = () => {
    const out = closeQuarter(state, drafts, ctx());
    if (!out.ok) return;
    run(out.changes);
    onClosed({
      title: `Quarter ${out.closed.index + 1} is closed.`,
      body: `Quarter ${out.next.index + 1} begins ${monthDay(out.next.start)} with ${plural(out.carried, 'priority', 'priorities')} carried forward. Choose the rest when you are ready.`,
    });
  };

  return (
    <Sheet onClose={onClose} tall>
      {titleId => (
        <>
          <div>
            <div className="eyebrow">Quarter review</div>
            <h2 id={titleId} className="sheet-title sheet-title--review">Looking back on quarter {n}</h2>
            <p className="muted sheet-intro">{quarterRange(quarter)}. For each priority: what happened, and whether to continue, adjust, or retire it. Nothing here is a verdict on you.</p>
          </div>
          {active.map(p => {
            const d = reviewDraftFor(drafts, p.id);
            return (
              <div key={p.id} className="review-row">
                <div className="review-row-title">{p.title}</div>
                <div className="review-was">Progress was going to look like: {p.progress || 'not written down'}</div>
                <textarea className="input" rows={2} value={d.outcome} onChange={e => update(p.id, { outcome: e.target.value })} placeholder="What actually happened?" aria-label={`What actually happened with ${p.title}?`} />
                <div className="segmented" role="radiogroup" aria-label={`Decision for ${p.title}`}>
                  {DECISIONS.map(k => (
                    <button key={k} role="radio" aria-checked={d.decision === k} className={`segment${d.decision === k ? ' is-on' : ''}`} onClick={() => update(p.id, { decision: k })}>{k}</button>
                  ))}
                </div>
                {d.decision === 'adjust' && (
                  <input className="input" value={d.change} onChange={e => update(p.id, { change: e.target.value })} placeholder="What changes next quarter?" aria-label={`What changes next quarter for ${p.title}?`} />
                )}
                {d.decision === 'retire' && (
                  <p className="muted muted--small">Setting something down is a decision, not a failure. Its projects stay on the go.</p>
                )}
              </div>
            );
          })}
          <div className="review-foot">
            <span className="review-summary">{counts.continue} continue · {counts.adjust} adjust · {counts.retire} retire</span>
            <button className="btn-primary full tall" onClick={close}>Close Q{n} · begin Q{nextN}</button>
            <button className="btn-outline full" onClick={onClose}>Come back later</button>
          </div>
        </>
      )}
    </Sheet>
  );
}
