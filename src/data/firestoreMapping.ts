// How planner data is laid out in Firestore (see docs/PLAN.md), kept free of
// the Firebase SDK so the mapping can be tested on its own.
import { COLLECTION_NAMES, type Change, type CollectionName, type Collections } from '../domain/changes';
import { defaultSettings, type PlannerState, type Settings } from '../domain/model';

type Data = Record<string, unknown>;

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
/**
 * Times are stored as Firestore timestamps (readable in the console). Older
 * documents hold plain millisecond numbers; both read back as milliseconds.
 */
function millisOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof (v as { toMillis?: unknown }).toMillis === 'function') return (v as { toMillis: () => number }).toMillis();
  return null;
}
const millis = (v: unknown) => millisOrNull(v) ?? 0;

/** Entity fields holding a time; written through the adapter's timestamp encoder. */
const TIME_FIELDS = new Set(['createdAt', 'completedAt', 'clearedAt']);
const strOrNull = (v: unknown) => (typeof v === 'string' && v ? v : null);

/** The settings fields stored on users/{uid}. */
export function settingsFromDoc(data: Data | undefined, timeZone: string): Settings {
  const d = defaultSettings(timeZone);
  if (!data) return d;
  return {
    birthday: strOrNull(data.birthday),
    timeZone: str(data.timeZone, d.timeZone),
    notificationsOn: data.notificationsOn === true,
    notificationTime: str(data.notificationTime, d.notificationTime),
    lastReminderDate: strOrNull(data.lastReminderDate),
  };
}

/** Reads a stored document, filling gaps (for example after a hand edit in the Firebase console). */
export function entityFromDoc<C extends CollectionName>(collection: C, id: string, data: Data): Collections[C] {
  const createdAt = millis(data.createdAt);
  const read: { [K in CollectionName]: () => Collections[K] } = {
    cookies: () => ({ id, text: str(data.text), done: data.done === true, createdAt, completedAt: millisOrNull(data.completedAt), clearedAt: millisOrNull(data.clearedAt) }),
    weeklies: () => ({ id, text: str(data.text), doneWeek: strOrNull(data.doneWeek), createdAt }),
    goals: () => ({ id, text: str(data.text), done: data.done === true, completedAt: millisOrNull(data.completedAt), createdAt }),
    rejections: () => ({ id, n: typeof data.n === 'number' ? data.n : 0, text: str(data.text), date: str(data.date), createdAt }),
    quotes: () => ({ id, text: str(data.text), by: str(data.by), createdAt }),
  };
  return read[collection]() as Collections[C];
}

export type Write =
  | { kind: 'set'; path: string[]; data: Data; merge: boolean }
  | { kind: 'delete'; path: string[] };

/**
 * The document writes that carry out a list of changes for one user.
 * `encodeTime` turns a millisecond time into the stored form (a Firestore timestamp).
 */
export function writesFor(uid: string, changes: readonly Change[], encodeTime: (ms: number) => unknown = ms => ms): Write[] {
  return changes.map(c => {
    if (c.op === 'settings') return { kind: 'set', path: ['users', uid], data: { ...c.patch }, merge: true };
    if (c.op === 'delete') return { kind: 'delete', path: ['users', uid, c.collection, c.id] };
    const { id, ...fields } = c.value;
    const data = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, TIME_FIELDS.has(k) && typeof v === 'number' ? encodeTime(v) : v]));
    return { kind: 'set', path: ['users', uid, c.collection, id], data, merge: false };
  });
}

/** Builds the whole state once the user document and every collection have reported in. */
export class StateAssembler {
  private settings: Settings | undefined;
  private readonly parts = new Map<CollectionName, unknown[]>();

  constructor(private readonly timeZone: string) {}

  setSettings(data: Data | undefined) {
    this.settings = settingsFromDoc(data, this.timeZone);
  }

  setCollection<C extends CollectionName>(collection: C, items: Collections[C][]) {
    this.parts.set(collection, items);
  }

  state(): PlannerState | null {
    if (!this.settings || COLLECTION_NAMES.some(c => !this.parts.has(c))) return null;
    const get = <C extends CollectionName>(c: C) => this.parts.get(c) as Collections[C][];
    return {
      settings: this.settings,
      cookies: get('cookies'), weeklies: get('weeklies'), goals: get('goals'), rejections: get('rejections'), quotes: get('quotes'),
    };
  }
}
