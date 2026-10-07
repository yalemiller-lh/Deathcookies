import { Sheet } from '../components/Sheet';
import { BirthdayForm } from './BirthdayForm';

export function BirthdaySheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      {titleId => (
        <>
          <div className="eyebrow">Your rhythm</div>
          <h2 id={titleId} className="sheet-title sheet-title--loud">Your year starts on your birthday</h2>
          <p className="muted">Four quarters of three months follow from it. Change the date and everything recalculates.</p>
          <BirthdayForm onSaved={onClose} onCancel={onClose} />
        </>
      )}
    </Sheet>
  );
}
