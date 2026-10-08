// ReminderStore over the Firestore REST API (the Admin SDK does not run on
// Workers). Documents are read through the app's own mapping.
import { entityFromDoc } from '../../src/data/firestoreMapping';
import { DEFAULT_NOTIFICATION_TIME } from '../../src/domain/model';
import type { ReminderStore, StoredSubscription } from './reminders';

type Value = Record<string, unknown>;
type Fields = Record<string, Value>;
interface Doc { name: string; fields?: Fields }

/** Firestore's typed values → plain values. Timestamps keep a toMillis() like the SDK's. */
export function decodeValue(v: Value): unknown {
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) { const ms = Date.parse(String(v.timestampValue)); return { toMillis: () => ms }; }
  if ('mapValue' in v) return decodeFields((v.mapValue as { fields?: Fields }).fields);
  if ('arrayValue' in v) return ((v.arrayValue as { values?: Value[] }).values ?? []).map(decodeValue);
  return null;
}

export function decodeFields(fields: Fields | undefined): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields ?? {}).map(([k, v]) => [k, decodeValue(v)]));
}

const idOf = (doc: Doc) => doc.name.slice(doc.name.lastIndexOf('/') + 1);
const str = (v: unknown, fallback: string) => (typeof v === 'string' && v ? v : fallback);

export function firestoreRestStore(projectId: string, token: () => Promise<string>, fetchFn: typeof fetch = fetch): ReminderStore {
  const root = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

  async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
    const res = await fetchFn(url, {
      method,
      headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Firestore ${method} ${url.slice(root.length) || '/'}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as T;
  }

  async function listAll(path: string): Promise<Doc[]> {
    const docs: Doc[] = [];
    let pageToken = '';
    do {
      const page = await call<{ documents?: Doc[]; nextPageToken?: string }>('GET', `${root}/${path}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`);
      docs.push(...(page.documents ?? []));
      pageToken = page.nextPageToken ?? '';
    } while (pageToken);
    return docs;
  }

  return {
    async usersWithRemindersOn() {
      const rows = await call<{ document?: Doc }[]>('POST', `${root}:runQuery`, {
        structuredQuery: {
          from: [{ collectionId: 'users' }],
          where: { fieldFilter: { field: { fieldPath: 'notificationsOn' }, op: 'EQUAL', value: { booleanValue: true } } },
        },
      });
      return rows.flatMap(r => (r.document ? [r.document] : [])).map(doc => {
        const data = decodeFields(doc.fields);
        return {
          uid: idOf(doc),
          settings: { notificationsOn: true, notificationTime: str(data.notificationTime, DEFAULT_NOTIFICATION_TIME), timeZone: str(data.timeZone, 'UTC') },
          lastReminderDate: typeof data.lastReminderDate === 'string' ? data.lastReminderDate : null,
        };
      });
    },
    async cookies(uid) {
      return (await listAll(`users/${uid}/cookies`)).map(doc => entityFromDoc('cookies', idOf(doc), decodeFields(doc.fields)));
    },
    async subscriptions(uid) {
      return (await listAll(`users/${uid}/pushSubscriptions`)).map(doc => {
        const data = decodeFields(doc.fields) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
        return { id: idOf(doc), endpoint: data.endpoint ?? '', keys: { p256dh: data.keys?.p256dh ?? '', auth: data.keys?.auth ?? '' } } satisfies StoredSubscription;
      }).filter(s => s.endpoint && s.keys.p256dh && s.keys.auth);
    },
    async markSent(uid, date) {
      await call('PATCH', `${root}/users/${uid}?updateMask.fieldPaths=lastReminderDate`, { fields: { lastReminderDate: { stringValue: date } } });
    },
    async removeSubscription(uid, id) {
      await call('DELETE', `${root}/users/${uid}/pushSubscriptions/${id}`);
    },
  };
}
