// Screens before the home screen: signing in, and choosing the birthday.
import { useState } from 'react';
import { BirthdayForm } from './sheets/BirthdayForm';

function BrandMark() {
  return <div className="brand-mark" aria-hidden="true"><span /></div>;
}

export function SignIn({ onSignIn }: { onSignIn: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSignIn();
    } catch (e) {
      setError((e as Error).message || 'Sign-in did not finish.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="centered">
      <div className="welcome">
        <BrandMark />
        <h1 className="welcome-title">Deathcookies</h1>
        <p className="muted">Urgent things first. Three priorities a quarter. A year that starts on your birthday.</p>
        <button className="btn-primary full tall" onClick={signIn} disabled={busy}>Sign in with Google</button>
        {error && <p className="hint" role="alert">{error}</p>}
      </div>
    </main>
  );
}

export function Onboarding() {
  return (
    <main className="centered">
      <div className="welcome">
        <BrandMark />
        <div className="eyebrow">Your rhythm</div>
        <h1 className="sheet-title sheet-title--loud">Your year starts on your birthday</h1>
        <p className="muted">Four quarters of three months follow from it. You can change it later in Settings.</p>
        <BirthdayForm onSaved={() => {}} />
      </div>
    </main>
  );
}

export function Loading() {
  return <main className="centered"><span className="loading">Loading…</span></main>;
}
