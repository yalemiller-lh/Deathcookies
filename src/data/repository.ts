// The only way the app reads or writes planner data.
import type { Change } from '../domain/changes';
import type { PlannerState } from '../domain/model';

export type Unsubscribe = () => void;

export interface PlannerRepository {
  /**
   * Calls `listener` with the whole state once it has loaded, then again after
   * every change — including changes made on another device.
   */
  subscribe(listener: (state: PlannerState) => void, onError?: (error: Error) => void): Unsubscribe;
  /** Applies all of the changes or none of them. */
  apply(changes: readonly Change[]): Promise<void>;
}

/** Push subscriptions for this account's devices, read by the reminder sender. */
export interface DeviceRegistry {
  savePushSubscription(subscription: PushSubscriptionJSON): Promise<void>;
  removePushSubscription(endpoint: string): Promise<void>;
}
