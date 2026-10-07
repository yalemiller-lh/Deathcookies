// In-memory repository: used by tests, and (with `onSave`) as on-device storage.
import { applyChanges, type Change } from '../domain/changes';
import type { PlannerState } from '../domain/model';
import type { PlannerRepository } from './repository';

export function memoryRepository(initial: PlannerState, onSave?: (state: PlannerState) => void): PlannerRepository & { snapshot(): PlannerState } {
  let state = initial;
  const listeners = new Set<(s: PlannerState) => void>();
  return {
    snapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => { listeners.delete(listener); };
    },
    async apply(changes: readonly Change[]) {
      if (changes.length === 0) return;
      state = applyChanges(state, changes);
      onSave?.(state);
      for (const l of listeners) l(state);
    },
  };
}
