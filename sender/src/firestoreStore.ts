// ReminderStore over Firestore, through the Admin SDK (which is not bound by
// firestore.rules; the service account's role limits it to the database).
import type { Firestore } from 'firebase-admin/firestore';
import type { Cookie } from '../../src/domain/model';
import { DEFAULT_NOTIFICATION_TIME } from '../../src/domain/model';
import type { ReminderStore, StoredSubscription } from './reminders';

export function firestoreStore(db: Firestore): ReminderStore {
  return {
    async usersWithRemindersOn() {
      const snap = await db.collection('users').where('notificationsOn', '==', true).get();
      return snap.docs.map(d => ({
        uid: d.id,
        settings: { notificationsOn: true, notificationTime: d.get('notificationTime') ?? DEFAULT_NOTIFICATION_TIME, timeZone: d.get('timeZone') ?? 'UTC' },
        lastReminderDate: d.get('lastReminderDate') ?? null,
      }));
    },
    async cookies(uid) {
      const snap = await db.collection(`users/${uid}/cookies`).get();
      return snap.docs.map(d => ({ id: d.id, text: String(d.get('text') ?? ''), done: d.get('done') === true, createdAt: Number(d.get('createdAt') ?? 0) }) satisfies Cookie);
    },
    async subscriptions(uid) {
      const snap = await db.collection(`users/${uid}/pushSubscriptions`).get();
      return snap.docs.map(d => ({ id: d.id, endpoint: d.get('endpoint'), keys: d.get('keys') }) as StoredSubscription);
    },
    async markSent(uid, date) {
      await db.doc(`users/${uid}`).set({ lastReminderDate: date }, { merge: true });
    },
    async removeSubscription(uid, id) {
      await db.doc(`users/${uid}/pushSubscriptions/${id}`).delete();
    },
  };
}
