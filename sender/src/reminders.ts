// Who gets a reminder now, and sending it. Storage and the push service are
// passed in, so this runs the same against Firestore or test fakes.
import type { ISODate } from '../../src/domain/dates';
import type { Cookie, Settings } from '../../src/domain/model';
import { reminderDueDate, reminderMessage, type ReminderMessage } from '../../src/domain/reminder';

export interface StoredSubscription {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface ReminderUser {
  uid: string;
  settings: Pick<Settings, 'notificationsOn' | 'notificationTime' | 'timeZone'>;
  /** Local date of the last reminder sent. */
  lastReminderDate: ISODate | null;
}

export interface ReminderStore {
  usersWithRemindersOn(): Promise<ReminderUser[]>;
  cookies(uid: string): Promise<Cookie[]>;
  subscriptions(uid: string): Promise<StoredSubscription[]>;
  markSent(uid: string, date: ISODate): Promise<void>;
  removeSubscription(uid: string, id: string): Promise<void>;
}

/** 'gone' means the browser has dropped the subscription; it will never work again. */
export type SendResult = 'sent' | 'gone' | 'failed';

export interface PushSender {
  send(subscription: StoredSubscription, message: ReminderMessage): Promise<SendResult>;
}

export interface DeliveryReport {
  sent: number;
  removed: number;
  failed: number;
}

/** Send the current reminder to every device of one person; drop dead subscriptions. */
export async function sendToUser(store: ReminderStore, sender: PushSender, uid: string): Promise<DeliveryReport> {
  const [subscriptions, cookies] = await Promise.all([store.subscriptions(uid), store.cookies(uid)]);
  const message = reminderMessage(cookies);
  const results = await Promise.all(subscriptions.map(s => sender.send(s, message)));
  const gone = subscriptions.filter((_, i) => results[i] === 'gone');
  await Promise.all(gone.map(s => store.removeSubscription(uid, s.id)));
  return { sent: results.filter(r => r === 'sent').length, removed: gone.length, failed: results.filter(r => r === 'failed').length };
}

export interface RunReport extends DeliveryReport {
  due: number;
  errors: number;
}

/** One scheduled run: remind everyone whose reminder time has come today. */
export async function sendDueReminders(store: ReminderStore, sender: PushSender, now: Date): Promise<RunReport> {
  const report: RunReport = { due: 0, sent: 0, removed: 0, failed: 0, errors: 0 };
  for (const user of await store.usersWithRemindersOn()) {
    const date = reminderDueDate(user.settings, now, user.lastReminderDate);
    if (!date) continue;
    report.due++;
    try {
      const r = await sendToUser(store, sender, user.uid);
      report.sent += r.sent;
      report.removed += r.removed;
      report.failed += r.failed;
      // Only a total failure is retried (on the next run, within the grace window).
      if (r.sent > 0 || r.failed === 0) await store.markSent(user.uid, date);
    } catch {
      report.errors++;
    }
  }
  return report;
}
