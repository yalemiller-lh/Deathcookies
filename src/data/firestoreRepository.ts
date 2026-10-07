// Firestore adapters: the planner's data and this account's push subscriptions.
import { collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch, type Firestore } from 'firebase/firestore';
import { httpsCallable, type Functions } from 'firebase/functions';
import { COLLECTION_NAMES } from '../domain/changes';
import { entityFromDoc, StateAssembler, writesFor } from './firestoreMapping';
import type { DeviceRegistry, PlannerRepository } from './repository';

export function firestoreRepository(db: Firestore, uid: string, timeZone: string): PlannerRepository {
  return {
    subscribe(listener, onError) {
      const assembled = new StateAssembler(timeZone);
      const emit = () => { const s = assembled.state(); if (s) listener(s); };
      const fail = (e: Error) => onError?.(e);
      const unsubscribers = [
        onSnapshot(doc(db, 'users', uid), snap => { assembled.setSettings(snap.data()); emit(); }, fail),
        ...COLLECTION_NAMES.map(name => onSnapshot(collection(db, 'users', uid, name), snap => {
          assembled.setCollection(name, snap.docs.map(d => entityFromDoc(name, d.id, d.data())));
          emit();
        }, fail)),
      ];
      return () => { for (const u of unsubscribers) u(); };
    },
    async apply(changes) {
      if (changes.length === 0) return;
      const batch = writeBatch(db);
      for (const w of writesFor(uid, changes)) {
        const [first, ...rest] = w.path;
        const ref = doc(db, first!, ...rest);
        if (w.kind === 'delete') batch.delete(ref);
        else batch.set(ref, w.data, { merge: w.merge });
      }
      // Resolves when the server confirms; the change shows locally (and offline) at once.
      await batch.commit();
    },
  };
}

async function subscriptionId(endpoint: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

export function firestoreDevices(db: Firestore, uid: string, functions: Functions): DeviceRegistry {
  return {
    async savePushSubscription(subscription) {
      if (!subscription.endpoint || !subscription.keys) throw new Error('The browser returned an incomplete push subscription.');
      await setDoc(doc(db, 'users', uid, 'pushSubscriptions', await subscriptionId(subscription.endpoint)), {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        createdAt: Date.now(),
        userAgent: navigator.userAgent.slice(0, 200),
      });
    },
    async removePushSubscription(endpoint) {
      await deleteDoc(doc(db, 'users', uid, 'pushSubscriptions', await subscriptionId(endpoint)));
    },
    async sendTestReminder() {
      const result = await httpsCallable<void, { sent: number; failed: number; removed: number }>(functions, 'sendTestReminder')();
      return result.data;
    },
  };
}
