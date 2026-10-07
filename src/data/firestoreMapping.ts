// How planner data is laid out in Firestore (see docs/PLAN.md), kept free of
// the Firebase SDK so the mapping can be tested on its own.
import { COLLECTION_NAMES, type Change, type CollectionName, type Collections } from '../domain/changes';
import { CATEGORIES, defaultSettings, type Category, type PlannerState, type Settings } from '../domain/model';

type Data = Record<string, unknown>;

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
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
    closedQuarterKeys: Array.isArray(data.closedQuarterKeys) ? data.closedQuarterKeys.filter((k): k is string => typeof k === 'string') : [],
    lastReminderDate: strOrNull(data.lastReminderDate),
  };
}

/** Reads a stored document, filling gaps (for example after a hand edit in the Firebase console). */
export function entityFromDoc<C extends CollectionName>(collection: C, id: string, data: Data): Collections[C] {
  const createdAt = num(data.createdAt);
  const read: { [K in CollectionName]: () => Collections[K] } = {
    cookies: () => ({ id, text: str(data.text), done: data.done === true, createdAt }),
    priorities: () => ({
      id, title: str(data.title), why: str(data.why), progress: str(data.progress), createdAt,
      category: CATEGORIES.includes(data.category as Category) ? (data.category as Category) : null,
      status: data.status === 'paused' ? 'paused' : 'active',
      adjust: strOrNull(data.adjust),
    }),
    projects: () => ({ id, name: str(data.name), priorityId: strOrNull(data.priorityId), createdAt }),
    activity: () => ({ id, projectId: str(data.projectId), date: str(data.date), text: str(data.text), createdAt }),
    backburner: () => ({ id, text: str(data.text), date: str(data.date), createdAt }),
    quarterReviews: () => ({
      id, quarterKey: str(data.quarterKey), date: str(data.date), createdAt,
      decisions: Array.isArray(data.decisions) ? (data.decisions as Collections['quarterReviews']['decisions']) : [],
    }),
  };
  return read[collection]() as Collections[C];
}

export type Write =
  | { kind: 'set'; path: string[]; data: Data; merge: boolean }
  | { kind: 'delete'; path: string[] };

/** The document writes that carry out a list of changes for one user. */
export function writesFor(uid: string, changes: readonly Change[]): Write[] {
  return changes.map(c => {
    if (c.op === 'settings') return { kind: 'set', path: ['users', uid], data: { ...c.patch }, merge: true };
    if (c.op === 'delete') return { kind: 'delete', path: ['users', uid, c.collection, c.id] };
    const { id, ...data } = c.value;
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
      cookies: get('cookies'), priorities: get('priorities'), projects: get('projects'),
      activity: get('activity'), backburner: get('backburner'), quarterReviews: get('quarterReviews'),
    };
  }
}
