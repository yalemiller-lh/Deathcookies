// Screens before the home screen: signing in, and choosing the birthday.
import { useState, type FormEvent } from 'react';
import type { AuthService } from '../services/auth';
import { BirthdayForm } from './sheets/BirthdayForm';

/** Shows which version is running, to check a phone has the latest. */
export function BuildStamp() {
  return <p className="build-stamp">Version {__BUILD__}</p>;
}

function BrandMark() {
  return <div className="brand-mark" aria-hidden="true"><span /></div>;
}

export function SignIn({ auth }: { auth: AuthService }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [usePassword, setUsePassword] = useState(!auth.googleAvailable);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const attempt = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message || 'Sign-in did not finish.');
    } finally {
      setBusy(false);
    }
  };
  const submitPassword = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    void attempt(() => auth.signInWithPassword(email, password));
  };

  return (
    <main className="centered">
      <div className="welcome">
        <BrandMark />
        <h1 className="welcome-title">Deathcookies</h1>
        <p className="muted">Urgent things first. Three priorities a quarter. A year that starts on your birthday.</p>
        {!auth.googleAvailable && (
          <p className="preview-box">Google sign-in does not work on this phone. Use your Google email with the password you set on your computer (Settings → Account).</p>
        )}
        {usePassword ? (
          <form className="stack-8" onSubmit={submitPassword}>
            <input className="input" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" aria-label="Email" />
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" aria-label="Password" />
            <button type="submit" className="btn-primary full tall" disabled={busy}>Sign in</button>
          </form>
        ) : (
          <button className="btn-primary full tall" onClick={() => void attempt(() => auth.signIn())} disabled={busy}>Sign in with Google</button>
        )}
        {auth.googleAvailable && (
          <div>
            <button className="text-btn text-btn--start" onClick={() => { setUsePassword(p => !p); setError(null); }}>
              {usePassword ? 'Use Google instead' : 'Use email and password instead'}
            </button>
          </div>
        )}
        {error && <p className="hint" role="alert">{error}</p>}
        <BuildStamp />
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
