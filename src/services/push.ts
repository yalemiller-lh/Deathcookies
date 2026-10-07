// Browser push notifications for this device.
import type { DeviceRegistry } from '../data/repository';
import type { ReminderMessage } from '../domain/reminder';

/**
 * unsupported   — this browser cannot receive push (or no server is configured)
 * needs-install — iPhone/iPad Safari: only works once added to the Home Screen
 * default       — not asked yet
 */
export type PushStatus = 'unsupported' | 'needs-install' | 'default' | 'granted' | 'denied';

export interface PushService {
  status(): PushStatus;
  /** Asks permission (must follow a tap) and registers this device for reminders. */
  enable(): Promise<PushStatus>;
  /** Shows a reminder on this device straight away, to check it displays. */
  showNow(message: ReminderMessage): Promise<void>;
}

function isAppleMobile(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

function base64UrlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = (s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function browserPush(vapidPublicKey: string | null, devices: DeviceRegistry): PushService {
  const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const service: PushService = {
    status() {
      if (!supported()) return isAppleMobile() && !isStandalone() ? 'needs-install' : 'unsupported';
      if (!vapidPublicKey) return 'unsupported';
      return Notification.permission === 'default' ? 'default' : Notification.permission;
    },
    async enable() {
      if (service.status() === 'unsupported' || service.status() === 'needs-install') return service.status();
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return service.status();
      const registration = await navigator.serviceWorker.ready;
      const subscription = (await registration.pushManager.getSubscription())
        ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(vapidPublicKey!) }));
      await devices.savePushSubscription(subscription.toJSON());
      return 'granted';
    },
    async showNow(message) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(message.title, { body: message.body, icon: '/icons/icon-192.png', badge: '/icons/badge-72.png', tag: 'daily-reminder' });
    },
  };
  return service;
}
