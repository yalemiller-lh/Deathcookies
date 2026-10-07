import { useState, type FormEvent } from 'react';
import { MIN_PASSWORD_LENGTH, type AuthService } from '../../services/auth';

/**
 * Adds a password to the Google account, so the phone's Home Screen app (where
 * Google sign-in cannot finish) can sign in with the same email.
 */
export function PasswordSetting({ auth, email, hasPassword }: { auth: AuthService; email: string; hasPassword: boolean }) {
  const [done, setDone] = useState(hasPassword);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (done) {
    return <p className="muted muted--small">Password set. On the iPhone app, sign in with {email} and that password.</p>;
  }
  if (!open) {
    return (
      <>
        <p className="muted muted--small">The iPhone Home Screen app cannot use Google sign-in. Set a password to sign in there with this email.</p>
        <button className="btn-outline full" onClick={() => setOpen(true)}>Set a password</button>
      </>
    );
  }

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) { setMessage(`Use at least ${MIN_PASSWORD_LENGTH} characters.`); return; }
    if (password !== confirm) { setMessage('The two passwords do not match.'); return; }
    setBusy(true);
    setMessage(null);
    try {
      await auth.setPassword(password);
      setDone(true);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack-8" onSubmit={save}>
      {/* Lets the browser's password manager save it against the right account. */}
      <input type="email" autoComplete="username" value={email} readOnly hidden />
      <input className="input" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" aria-label="New password" />
      <input className="input" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Same password again" aria-label="Same password again" />
      {message && <p className="hint" role="alert">{message}</p>}
      <div className="btn-row">
        <button type="submit" className="btn-primary" disabled={busy}>Save password</button>
        <button type="button" className="btn-outline btn-outline--tall" onClick={() => { setOpen(false); setMessage(null); }}>Cancel</button>
      </div>
    </form>
  );
}
