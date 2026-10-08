// Public identifiers for the Firebase project. Safe to commit: access to data
// is controlled by firestore.rules, not by keeping these secret.
import type { FirebaseOptions } from 'firebase/app';

/**
 * The Firebase web app. authDomain is the hosting domain rather than
 * firebaseapp.com so Google sign-in works inside an iPhone home-screen app.
 * Set to null to run on on-device storage only.
 */
export const firebaseConfig: FirebaseOptions | null = {
  apiKey: 'AIzaSyCIIyxasauLqsm08hfgDCQ3Gf_robH6LcM',
  authDomain: 'deathcookies-4c3ca.web.app',
  projectId: 'deathcookies-4c3ca',
  storageBucket: 'deathcookies-4c3ca.firebasestorage.app',
  messagingSenderId: '600450715709',
  appId: '1:600450715709:web:74807fa7e0090abf7f1a54',
};

/** The reminder worker (worker/), for test sends from Settings. null until it is deployed. */
export const reminderServiceUrl: string | null = 'https://deathcookies-reminders.deathcookies-reminders.workers.dev';

/** Web Push public key. Its private half is the VAPID_PRIVATE_KEY secret of the reminder sender. */
export const vapidPublicKey: string | null = 'BCKFzBhIMieg244HrftGumYboto0cipsgpJ32ysWM_haU0cKcZ48kOh2D66PcNvojRnN6sB4HTKAeTwBVBFI7Gk';
