// Cloud Functions: the scheduled daily reminder, and an on-demand test send.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import webpush from 'web-push';
import { vapidPublicKey } from '../../src/app/firebaseConfig';
import type { Cookie } from '../../src/domain/model';
import { DEFAULT_NOTIFICATION_TIME } from '../../src/domain/model';
import { sendDueReminders, sendToUser, type PushSender, type ReminderStore, type StoredSubscription } from './reminders';

initializeApp();
const db = getFirestore();
const VAPID_PRIVATE_KEY = defineSecret('VAPID_PRIVATE_KEY');

const store: ReminderStore = {
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

function pushSender(): PushSender {
  if (!vapidPublicKey) throw new Error('vapidPublicKey is not set in src/app/firebaseConfig.ts');
  const project = process.env.GCLOUD_PROJECT ?? 'deathcookies';
  webpush.setVapidDetails(`https://${project}.web.app`, vapidPublicKey, VAPID_PRIVATE_KEY.value());
  return {
    async send(subscription, message) {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, JSON.stringify(message), { TTL: 6 * 3600 });
        return 'sent';
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) return 'gone';
        logger.warn('push failed', { status, endpoint: subscription.endpoint.slice(0, 60) });
        return 'failed';
      }
    },
  };
}

export const dailyReminder = onSchedule(
  { schedule: 'every 15 minutes', secrets: [VAPID_PRIVATE_KEY], timeoutSeconds: 120, memory: '256MiB', maxInstances: 1, retryCount: 0 },
  async () => {
    const report = await sendDueReminders(store, pushSender(), new Date());
    if (report.due > 0) logger.info('daily reminders', report);
  },
);

/** "Send a test notification" in Settings: pushes the current reminder to the caller's devices. */
export const sendTestReminder = onCall({ secrets: [VAPID_PRIVATE_KEY], maxInstances: 2 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  return sendToUser(store, pushSender(), request.auth.uid);
});
