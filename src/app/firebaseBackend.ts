// The online backend: Google sign-in and Firestore. Reminders are sent by the
// Cloudflare worker in worker/, which this only asks for test sends.
// Loaded only when src/app/firebaseConfig.ts is filled in.
import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { firestoreDevices, firestoreRepository } from '../data/firestoreRepository';
import { firebaseAuth } from '../services/firebaseAuth';
import { httpReminderService } from '../services/reminderService';
import type { Backend } from './backend';

export function firebaseBackend(config: FirebaseOptions, vapidPublicKey: string | null, reminderServiceUrl: string | null, timeZone: string): Backend {
  const app = initializeApp(config);
  // The local cache keeps the app working offline and syncs when back online.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });
  const auth = firebaseAuth(getAuth(app));
  return {
    auth,
    open: session => ({
      repository: firestoreRepository(db, session.uid, timeZone),
      devices: firestoreDevices(db, session.uid),
    }),
    vapidPublicKey,
    reminders: reminderServiceUrl ? httpReminderService(reminderServiceUrl, () => auth.idToken()) : null,
  };
}
