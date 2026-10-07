// Public identifiers for the Firebase project. Safe to commit: access to data
// is controlled by firestore.rules, not by keeping these secret.
import type { FirebaseOptions } from 'firebase/app';

/** null until the Firebase project exists; the app then runs on on-device storage. */
export const firebaseConfig: FirebaseOptions | null = null;

/** Web Push public key. Its private half is the VAPID_PRIVATE_KEY secret of the reminder sender. */
export const vapidPublicKey: string | null = 'BCKFzBhIMieg244HrftGumYboto0cipsgpJ32ysWM_haU0cKcZ48kOh2D66PcNvojRnN6sB4HTKAeTwBVBFI7Gk';
