// No accounts or server: data in this browser's storage, no push reminders.
import { localDevices, localRepository } from '../data/localRepository';
import { deviceAuth } from '../services/auth';
import type { Backend } from './backend';

export function localBackend(storage: Storage, timeZone: string): Backend {
  return {
    auth: deviceAuth,
    open: () => ({ repository: localRepository(storage, timeZone), devices: localDevices }),
    vapidPublicKey: null,
  };
}
