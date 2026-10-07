// On-device storage (localStorage). Used when no Firebase project is configured,
// so the app can run and be previewed without an account. Data stays on this device.
import { emptyState, type PlannerState } from '../domain/model';
import { memoryRepository } from './memoryRepository';
import type { DeviceRegistry, PlannerRepository } from './repository';

const KEY = 'deathcookies:v1';

function load(storage: Storage, timeZone: string): PlannerState {
  const fresh = emptyState(timeZone);
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as Partial<PlannerState>;
    return { ...fresh, ...saved, settings: { ...fresh.settings, ...saved.settings } };
  } catch {
    return fresh;
  }
}

export function localRepository(storage: Storage, timeZone: string): PlannerRepository {
  return memoryRepository(load(storage, timeZone), state => {
    try { storage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked: keep working in memory */ }
  });
}

/** On-device mode has no server to send reminders, so subscriptions go nowhere. */
export const localDevices: DeviceRegistry = {
  async savePushSubscription() {},
  async removePushSubscription() {},
  async sendTestReminder() { return null; },
};
