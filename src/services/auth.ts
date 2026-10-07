// Who is using the app. The UI sees only this interface.
import type { Unsubscribe } from '../data/repository';

export interface Session {
  uid: string;
  email: string | null;
}

export interface AuthService {
  /** 'device': no account, data stays on this device. 'google': signed in with Google. */
  readonly kind: 'device' | 'google';
  /** Fires once the session is known, then on every sign-in or sign-out. */
  onChange(listener: (session: Session | null) => void): Unsubscribe;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}

/** On-device mode: always "signed in" as this device. */
export const deviceAuth: AuthService = {
  kind: 'device',
  onChange(listener) {
    listener({ uid: 'device', email: null });
    return () => {};
  },
  async signIn() {},
  async signOut() {},
};
