// Who is using the app. The UI sees only this interface.
import type { Unsubscribe } from '../data/repository';

export interface Session {
  uid: string;
  email: string | null;
  /** The account can also sign in with its email and a password. */
  hasPassword: boolean;
}

export interface AuthService {
  /** 'device': no account, data stays on this device. 'google': a Google account (optionally with a password). */
  readonly kind: 'device' | 'google';
  /**
   * False where Google sign-in cannot finish (iPhone and iPad, and any phone's
   * Home Screen app): Google's page loses the sign-in on the way back. There,
   * the account's email and password are used instead.
   */
  readonly googleAvailable: boolean;
  /** Fires once the session is known, then on every sign-in or sign-out. */
  onChange(listener: (session: Session | null) => void): Unsubscribe;
  signIn(): Promise<void>;
  signInWithPassword(email: string, password: string): Promise<void>;
  /** Adds a password to the signed-in Google account. */
  setPassword(password: string): Promise<void>;
  signOut(): Promise<void>;
}

/** On-device mode: always "signed in" as this device. */
export const deviceAuth: AuthService = {
  kind: 'device',
  googleAvailable: false,
  onChange(listener) {
    listener({ uid: 'device', email: null, hasPassword: false });
    return () => {};
  },
  async signIn() {},
  async signInWithPassword() {},
  async setPassword() {},
  async signOut() {},
};

/** Shortest password Firebase accepts. */
export const MIN_PASSWORD_LENGTH = 6;
