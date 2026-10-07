// What the app runs on: sign-in, storage and push, chosen once at start-up.
import type { DeviceRegistry, PlannerRepository } from '../data/repository';
import type { AuthService, Session } from '../services/auth';

export interface Backend {
  auth: AuthService;
  /** Storage for one signed-in person. */
  open(session: Session): { repository: PlannerRepository; devices: DeviceRegistry };
  /** Public key for Web Push; null when no server sends reminders. */
  vapidPublicKey: string | null;
}
