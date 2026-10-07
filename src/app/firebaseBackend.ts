// The online backend: Google sign-in, Firestore, and the reminder functions.
// Loaded only when src/app/firebaseConfig.ts is filled in.
import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { firestoreDevices, firestoreRepository } from '../data/firestoreRepository';
import { firebaseAuth } from '../services/firebaseAuth';
import type { Backend } from './backend';

export function firebaseBackend(config: FirebaseOptions, vapidPublicKey: string | null, timeZone: string): Backend {
  const app = initializeApp(config);
  // The local cache keeps the app working offline and syncs when back online.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });
  const functions = getFunctions(app);
  return {
    auth: firebaseAuth(getAuth(app)),
    open: session => ({
      repository: firestoreRepository(db, session.uid, timeZone),
      devices: firestoreDevices(db, session.uid, functions),
    }),
    vapidPublicKey,
  };
}
