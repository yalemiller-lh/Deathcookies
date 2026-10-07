import { useState } from 'react';
import { parseISODate } from '../../domain/dates';
import { reminderMessage } from '../../domain/reminder';
import { setReminder } from '../../domain/settings';
import type { PushStatus } from '../../services/push';
import { Sheet } from '../components/Sheet';
import { monthDayYear, time12, weekdayMonthDay } from '../format';
import { usePlanner } from '../PlannerContext';

const DEVICE_COPY: Record<PushStatus, string> = {
  unsupported: 'This browser cannot show notifications from Deathcookies.',
  'needs-install': 'On iPhone, add Deathcookies to your Home Screen first (Share → Add to Home Screen), then open it from there.',
  default: 'This device has not been asked yet.',
  granted: 'Notifications are on for this device.',
  denied: 'Notifications are blocked for this site. Allow them in the browser’s site settings.',
};

export function SettingsSheet({ onClose, onChangeBirthday }: { onClose: () => void; onChangeBirthday: () => void }) {
  const { state, run, services } = usePlanner();
  const { push, auth, session } = services;
  const { settings } = state;
  const [deviceStatus, setDeviceStatus] = useState<PushStatus>(() => push.status());
  const [testResult, setTestResult] = useState<string | null>(null);
  const deviceCopy = auth.kind === 'device' && deviceStatus === 'unsupported' ? 'Notifications start once the online database is connected.' : DEVICE_COPY[deviceStatus];

  const allowOnDevice = async () => {
    try {
      setDeviceStatus(await push.enable());
    } catch (e) {
      setTestResult(`Could not turn on notifications: ${(e as Error).message}`);
    }
  };
  const toggleReminder = () => {
    const on = !settings.notificationsOn;
    const out = setReminder({ notificationsOn: on });
    if (out.ok) run(out.changes);
    if (on && deviceStatus === 'default') void allowOnDevice();
  };
  const showNow = async () => {
    try {
      await push.showNow(reminderMessage(state.cookies));
      setTestResult(null);
    } catch (e) {
      setTestResult(`Could not show it: ${(e as Error).message}`);
    }
  };
  const setTime = (time: string) => {
    const out = setReminder({ notificationTime: time });
    if (out.ok) run(out.changes);
  };

  return (
    <Sheet onClose={onClose} tall>
      {titleId => (
        <>
          <div className="eyebrow">Settings</div>
          <h2 id={titleId} className="sheet-title sheet-title--loud">How it runs</h2>

          <div className="setting">
            <span className="label">Birthday</span>
            <div className="setting-row">
              <span className="setting-value">{settings.birthday ? monthDayYear(parseISODate(settings.birthday)) : 'Not set'}</span>
              <button className="text-btn text-btn--end text-btn--strong" onClick={onChangeBirthday}>Change</button>
            </div>
          </div>

          <div className="setting">
            <span className="label">Daily reminder</span>
            <div className="setting-row">
              <span className="setting-value" id="reminder-label">How many deathcookies are left</span>
              <button className="switch" role="switch" aria-checked={settings.notificationsOn} aria-labelledby="reminder-label" onClick={toggleReminder} />
            </div>
            <div className="setting-row">
              <label className="setting-value" htmlFor="reminder-time">Time</label>
              <input id="reminder-time" type="time" className="input time-input" value={settings.notificationTime} onChange={e => setTime(e.target.value)} />
            </div>
            <p className="muted muted--small">
              {settings.notificationsOn ? `Every day at ${time12(settings.notificationTime)}, on each device you allow below. It can arrive a few minutes late.` : 'Off. Nothing will be sent.'}
            </p>
            {auth.kind === 'google' && settings.notificationsOn && (
              <p className="hint">Last sent: {settings.lastReminderDate ? weekdayMonthDay(parseISODate(settings.lastReminderDate)) : 'not yet'}</p>
            )}
          </div>

          <div className="setting">
            <span className="label">This device</span>
            <p className="muted muted--small">{deviceCopy}</p>
            {deviceStatus === 'default' && <button className="btn-outline full" onClick={allowOnDevice}>Allow notifications on this device</button>}
            {deviceStatus === 'granted' && (
              <div><button className="text-btn text-btn--start text-btn--strong" onClick={() => void showNow()}>Show one now</button></div>
            )}
            {testResult && <p className="hint" role="status">{testResult}</p>}
          </div>

          <div className="setting">
            <span className="label">Account</span>
            {auth.kind === 'google' ? (
              <div className="setting-row">
                <span className="setting-value">{session.email ?? 'Signed in'}</span>
                <button className="text-btn text-btn--end text-btn--strong" onClick={() => void auth.signOut()}>Sign out</button>
              </div>
            ) : (
              <p className="muted muted--small">Saved on this device only. Connect the online database to use it on your phone and laptop together.</p>
            )}
          </div>

          <button className="btn-outline full" onClick={onClose}>Done</button>
        </>
      )}
    </Sheet>
  );
}
