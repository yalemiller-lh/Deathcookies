import { useState, type FormEvent } from 'react';

/** Underlined input with an outlined ADD button, at the foot of a list. */
export function AddRow({ placeholder, label, onAdd }: { placeholder: string; label: string; onAdd: (text: string) => void }) {
  const [text, setText] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text);
    setText('');
  };
  return (
    <form className="add-row" onSubmit={submit}>
      <input className="underline-input" value={text} onChange={e => setText(e.target.value)} placeholder={placeholder} aria-label={label} enterKeyHint="done" />
      <button type="submit" className="btn-outline btn-outline--bold">Add</button>
    </form>
  );
}
