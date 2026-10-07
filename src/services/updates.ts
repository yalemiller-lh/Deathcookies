// Notices when a newer version of the app has been deployed while it is open.
import type { Unsubscribe } from '../data/repository';

/** How often to check while the app stays open and visible. */
const CHECK_EVERY_MS = 30 * 60 * 1000;

export type UpdateWatcher = (onUpdate: () => void) => Unsubscribe;

/** Fetches the live build id from /version.json; null when it cannot be read (offline, dev server). */
export async function liveBuild(fetchFn: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await fetchFn('/version.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as { build?: unknown };
    return typeof body.build === 'string' ? body.build : null;
  } catch {
    return null;
  }
}

/**
 * Calls `onUpdate` once a build other than `current` is live. Checks when the
 * app comes back to the screen and every half hour while it is open.
 */
export function watchForUpdates(current: string, fetchFn: typeof fetch = fetch): UpdateWatcher {
  return onUpdate => {
    let stopped = false;
    let found = false;
    const check = async () => {
      if (stopped || found || document.visibilityState !== 'visible') return;
      const live = await liveBuild(fetchFn);
      if (!stopped && live && live !== current) {
        found = true;
        onUpdate();
      }
    };
    const onVisible = () => { void check(); };
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(onVisible, CHECK_EVERY_MS);
    void check();
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  };
}
