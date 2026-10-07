// Google sign-in through Firebase Auth.
import { getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type Auth } from 'firebase/auth';
import type { AuthService } from './auth';

/**
 * Home-screen apps (especially on iPhone) cannot hand a popup's result back,
 * so they sign in by redirect. That needs the app served from the auth domain,
 * which Firebase Hosting provides.
 */
function shouldRedirect(): boolean {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  return standalone || /iPhone|iPad|iPod|Android/.test(navigator.userAgent);
}

export function firebaseAuth(auth: Auth): AuthService {
  // Finishes a redirect sign-in; the session itself arrives through onAuthStateChanged.
  getRedirectResult(auth).catch(() => {});
  return {
    kind: 'google',
    onChange: listener => onAuthStateChanged(auth, user => listener(user ? { uid: user.uid, email: user.email } : null)),
    async signIn() {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      if (shouldRedirect()) await signInWithRedirect(auth, provider);
      else await signInWithPopup(auth, provider);
    },
    signOut: () => signOut(auth),
  };
}
