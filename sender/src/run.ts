// One run of the reminder sender (GitHub Actions calls this every 15 minutes).
//   node lib/run.mjs          remind everyone whose reminder time has come
//   node lib/run.mjs --test   send the current reminder to everyone with reminders on, now
// Needs FIREBASE_SERVICE_ACCOUNT (the key JSON) and VAPID_PRIVATE_KEY in the environment.
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import webpush from 'web-push';
import { vapidPublicKey } from '../../src/app/firebaseConfig';
import { firestoreStore } from './firestoreStore';
import { sendDueReminders, sendToUser, type PushSender } from './reminders';

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set. Add it under the repository's Settings → Secrets and variables → Actions.`);
  return value;
}

function webPushSender(subject: string): PushSender {
  if (!vapidPublicKey) throw new Error('vapidPublicKey is not set in src/app/firebaseConfig.ts');
  webpush.setVapidDetails(subject, vapidPublicKey, env('VAPID_PRIVATE_KEY'));
  return {
    async send(subscription, message) {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, JSON.stringify(message), { TTL: 6 * 3600 });
        return 'sent';
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) return 'gone';
        console.warn(`push failed (${status ?? 'no status'}) for ${new URL(subscription.endpoint).host}`);
        return 'failed';
      }
    },
  };
}

const account = JSON.parse(env('FIREBASE_SERVICE_ACCOUNT')) as { project_id: string };
initializeApp({ credential: cert(account as Parameters<typeof cert>[0]) });
const store = firestoreStore(getFirestore());
const sender = webPushSender(`https://${account.project_id}.web.app`);

if (process.argv.includes('--test')) {
  const users = await store.usersWithRemindersOn();
  for (const u of users) console.log('test send', await sendToUser(store, sender, u.uid));
  if (users.length === 0) console.log('Nobody has the daily reminder switched on.');
} else {
  const report = await sendDueReminders(store, sender, new Date());
  console.log('run', report);
  // A failed run makes GitHub email the repository owner.
  if (report.errors > 0) process.exitCode = 1;
}
