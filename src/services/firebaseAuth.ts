// Firebase Auth: Google sign-in, plus email and password for the phone's Home
// Screen app, where Google sign-in cannot finish.
import {
  EmailAuthProvider, getRedirectResult, GoogleAuthProvider, linkWithCredential, onAuthStateChanged,
  signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, signOut, type Auth, type User,
} from 'firebase/auth';
import type { AuthService, Session } from './auth';
import { isAppleMobile, isMobile, isStandalone } from './platform';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'That email and password do not match. If you have not set a password yet, do it on your computer: Settings → Account.',
  'auth/wrong-password': 'That email and password do not match.',
  'auth/user-not-found': 'No account uses that email yet. Sign in with Google on your computer first.',
  'auth/invalid-email': 'That does not look like an email address.',
  'auth/too-many-requests': 'Too many tries. Wait a few minutes and try again.',
  'auth/operation-not-allowed': 'Password sign-in is not switched on for this project yet.',
  'auth/weak-password': 'Use at least 6 characters.',
  'auth/provider-already-linked': 'This account already has a password.',
  'auth/requires-recent-login': 'For safety, sign out and back in, then set the password again.',
  'auth/network-request-failed': 'No connection. Check the internet and try again.',
  'auth/popup-blocked': 'The browser blocked the sign-in window. Allow pop-ups for this site and try again.',
  'auth/popup-closed-by-user': 'The sign-in window was closed before it finished.',
  'auth/cancelled-popup-request': 'The sign-in window was closed before it finished.',
};

/** Turns Firebase error codes into sentences the app can show. */
async function friendly<T>(action: Promise<T>): Promise<T> {
  try {
    return await action;
  } catch (e) {
    const code = (e as { code?: string }).code ?? '';
    throw new Error(MESSAGES[code] ?? (e as Error).message, { cause: e });
  }
}

const sessionOf = (user: User): Session => ({
  uid: user.uid,
  email: user.email,
  hasPassword: user.providerData.some(p => p.providerId === 'password'),
});

export function firebaseAuth(auth: Auth): AuthService {
  // On iPhone and iPad, Google sign-in fails ("missing initial state") both in the
  // Home Screen app and in Safari, so they always use email and password.
  const googleWorks = !isAppleMobile() && !(isStandalone() && isMobile());
  // Finishes a redirect sign-in; the session itself arrives through onAuthStateChanged.
  getRedirectResult(auth).catch(() => {});
  return {
    kind: 'google',
    googleAvailable: googleWorks,
    onChange: listener => onAuthStateChanged(auth, user => listener(user ? sessionOf(user) : null)),
    async signIn() {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      // Phone browsers sign in by redirect (popups are unreliable there); computers use a popup.
      await friendly(isMobile() ? signInWithRedirect(auth, provider) : signInWithPopup(auth, provider));
    },
    async signInWithPassword(email, password) {
      await friendly(signInWithEmailAndPassword(auth, email.trim(), password));
    },
    async setPassword(password) {
      const user = auth.currentUser;
      if (!user?.email) throw new Error('Sign in with Google first.');
      await friendly(linkWithCredential(user, EmailAuthProvider.credential(user.email, password)));
      await user.reload();
    },
    signOut: () => signOut(auth),
  };
}
