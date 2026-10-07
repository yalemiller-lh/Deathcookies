import { useState, type ClipboardEvent } from 'react';
import { addQuote, quotesNewestFirst, removeQuote, updateQuote, type Quote } from '../../domain/quotes';
import { parseQuoteText } from '../../domain/quoteText';
import { Sheet } from '../components/Sheet';
import { usePlanner } from '../PlannerContext';

interface Draft extends Quote {
  /** The saved quote being edited, or null for a new one. */
  id: string | null;
  hint: string;
}

const FROM_SCREENSHOT = 'Read from your screenshot. Check it before saving.';

/** The saved quotes: add, edit, remove, and how to send them from screenshots. */
export function QuotesSheet({ incoming, onClose }: { incoming: Quote | null; onClose: () => void }) {
  const { state, run, ctx } = usePlanner();
  const [draft, setDraft] = useState<Draft | null>(incoming ? { id: null, ...incoming, hint: FROM_SCREENSHOT } : null);
  const [showHow, setShowHow] = useState(false);
  const quotes = quotesNewestFirst(state);

  const save = () => {
    if (!draft) return;
    const input = { text: draft.text, by: draft.by };
    const out = draft.id === null ? addQuote(input, ctx()) : updateQuote(state, draft.id, input);
    if (!out.ok) {
      setDraft({ ...draft, hint: out.error === 'text-required' ? 'Write the quote first.' : 'This quote was removed on another device.' });
      return;
    }
    run(out.changes);
    setDraft(null);
  };

  return (
    <Sheet onClose={onClose} tall>
      {titleId => (
        <>
          <div>
            <div className="eyebrow">Quotes</div>
            <h2 id={titleId} className="sheet-title sheet-title--loud sheet-title--spaced">Words you have kept</h2>
            <p className="muted sheet-intro">
              {quotes.length > 0 ? 'The quote of the day is one of these, in turn.' : 'None yet. Until you save one, the quote of the day comes from a few classics.'}
            </p>
          </div>

          {draft ? (
            <QuoteForm draft={draft} onChange={setDraft} onSave={save} onCancel={() => setDraft(null)} />
          ) : (
            <button className="dashed-btn" onClick={() => setDraft({ id: null, text: '', by: '', hint: '' })}>+ Add a quote</button>
          )}

          {quotes.length > 0 && (
            <div className="list">
              {quotes.map(q => (
                <div key={q.id} className="quote-row">
                  <div className="quote-row-main">
                    <span className="quote-row-text">“{q.text}”</span>
                    {q.by && <span className="quote-by">— {q.by}</span>}
                  </div>
                  <button className="idea-promote" onClick={() => setDraft({ id: q.id, text: q.text, by: q.by, hint: '' })} aria-label={`Edit "${q.text}"`}>Edit</button>
                  <button className="idea-remove" onClick={() => run(removeQuote(state, q.id))} aria-label={`Remove "${q.text}"`}>×</button>
                </div>
              ))}
            </div>
          )}

          <div>
            <button className="text-btn text-btn--start" aria-expanded={showHow} onClick={() => setShowHow(s => !s)}>
              {showHow ? 'Hide the screenshot steps' : 'Save quotes from screenshots'}
            </button>
          </div>
          {showHow && <ShortcutSteps />}

          <button className="btn-outline full" onClick={onClose}>Done</button>
        </>
      )}
    </Sheet>
  );
}

function QuoteForm({ draft, onChange, onSave, onCancel }: { draft: Draft; onChange: (d: Draft) => void; onSave: () => void; onCancel: () => void }) {
  // Pasting a whole quote (say, copied with Live Text) into an empty form splits out the author.
  const paste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (draft.text || draft.by) return;
    const parsed = parseQuoteText(e.clipboardData.getData('text/plain'));
    if (!parsed.text) return;
    e.preventDefault();
    onChange({ ...draft, ...parsed });
  };
  return (
    <div className="card-stack editor">
      <label className="field">
        <span className="label">Quote</span>
        <textarea className="input" rows={4} value={draft.text} onChange={e => onChange({ ...draft, text: e.target.value, hint: draft.hint === FROM_SCREENSHOT ? draft.hint : '' })} onPaste={paste} placeholder="The words, as they were said" autoFocus={!draft.text} />
      </label>
      <label className="field">
        <span className="label">By</span>
        <input className="input" value={draft.by} onChange={e => onChange({ ...draft, by: e.target.value })} placeholder="Who said it (optional)" />
      </label>
      {draft.hint && <span className="hint" role="status">{draft.hint}</span>}
      <div className="btn-row">
        <button className="btn-primary" onClick={onSave}>Save</button>
        <button className="btn-outline btn-outline--tall" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/** How to set up the iOS Shortcut that sends a screenshot's text here. */
function ShortcutSteps() {
  const link = `${window.location.origin}/#quote=`;
  return (
    <div className="preview-box how-to">
      <p>On iPhone, a Shortcut adds "Save to Deathcookies" to the Share menu. Set it up once:</p>
      <ol>
        <li>Open the <b>Shortcuts</b> app and tap <b>+</b>. Name it <b>Save to Deathcookies</b>.</li>
        <li>Tap <b>ⓘ</b>, turn on <b>Show in Share Sheet</b>, and set it to receive <b>Images</b> only.</li>
        <li>Add the action <b>Extract Text from Image</b> (input: Shortcut Input).</li>
        <li>Add <b>URL Encode</b> (input: Text from Image).</li>
        <li>Add <b>Text</b> and type <code>{link}</code>, then insert <b>URL Encoded Text</b> straight after it.</li>
        <li>Add <b>Open URLs</b>. Done.</li>
      </ol>
      <p>Then: take a screenshot → <b>Share</b> → <b>Save to Deathcookies</b>. It opens in Safari; the first time, sign in there with your email and password.</p>
    </div>
  );
}
