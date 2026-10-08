// The reminder worker's test endpoint: asks it to push the current reminder to
// every device of the signed-in person now.

export interface DeliveryReport {
  sent: number;
  failed: number;
  removed: number;
}

export interface ReminderService {
  sendTest(): Promise<DeliveryReport>;
}

export function httpReminderService(baseUrl: string, idToken: () => Promise<string | null>, fetchFn: typeof fetch = (...a) => fetch(...a)): ReminderService {
  return {
    async sendTest() {
      const token = await idToken();
      if (!token) throw new Error('Sign in first.');
      const res = await fetchFn(`${baseUrl.replace(/\/$/, '')}/test`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const body = (await res.json().catch(() => ({}))) as Partial<DeliveryReport> & { error?: string };
      if (!res.ok) throw new Error(body.error ?? `The reminder service answered ${res.status}.`);
      return { sent: body.sent ?? 0, failed: body.failed ?? 0, removed: body.removed ?? 0 };
    },
  };
}
