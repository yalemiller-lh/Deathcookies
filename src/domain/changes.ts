// Commands describe their effect as a list of Changes. Repositories persist a
// list atomically; applyChanges is the reference meaning of that list.
import type { Cookie, PlannerState, Rejection, SavedQuote, Settings, Weekly } from './model';

export interface Collections {
  cookies: Cookie;
  weeklies: Weekly;
  rejections: Rejection;
  quotes: SavedQuote;
}

export type CollectionName = keyof Collections;

export const COLLECTION_NAMES: readonly CollectionName[] = ['cookies', 'weeklies', 'rejections', 'quotes'];

export type PutChange = { [C in CollectionName]: { op: 'put'; collection: C; value: Collections[C] } }[CollectionName];
export type DeleteChange = { op: 'delete'; collection: CollectionName; id: string };
export type SettingsChange = { op: 'settings'; patch: Partial<Settings> };
export type Change = PutChange | DeleteChange | SettingsChange;

/** Result of a command that can be refused by a rule. */
export type Outcome<E extends string, X extends object = object> = ({ ok: true; changes: Change[] } & X) | { ok: false; error: E };

export const put =<C extends CollectionName>(collection: C, value: Collections[C]) => ({ op: 'put', collection, value }) as PutChange;
export const remove = (collection: CollectionName, id: string): DeleteChange => ({ op: 'delete', collection, id });
export const patchSettings = (patch: Partial<Settings>): SettingsChange => ({ op: 'settings', patch });

function applyOne(state: PlannerState, change: Change): PlannerState {
  if (change.op === 'settings') return { ...state, settings: { ...state.settings, ...change.patch } };
  const list = state[change.collection] as { id: string }[];
  if (change.op === 'delete') return { ...state, [change.collection]: list.filter(x => x.id !== change.id) };
  const exists = list.some(x => x.id === change.value.id);
  const next = exists ? list.map(x => (x.id === change.value.id ? change.value : x)) : [...list, change.value];
  return { ...state, [change.collection]: next };
}

export function applyChanges(state: PlannerState, changes: readonly Change[]): PlannerState {
  return changes.reduce(applyOne, state);
}
