import { useEffect, useMemo, useState } from 'react';
import type { Backend } from '../app/backend';
import { setReminder } from '../domain/settings';
import type { Session } from '../services/auth';
import type { PushService } from '../services/push';
import type { UpdateWatcher } from '../services/updates';
import { Home } from './home/Home';
import { PlannerProvider, usePlanner, type PlannerServices } from './PlannerContext';
import { UpdateBanner } from './UpdateBanner';
import { Loading, Onboarding, SignIn } from './Welcome';

export interface AppProps {
  backend: Backend;
  makePush: (vapidPublicKey: string | null, devices: ReturnType<Backend['open']>['devices']) => PushService;
  clock?: () => Date;
  newId?: () => string;
  deviceTimeZone?: string;
  /** Watches for a newer deployed version; omitted in development and tests. */
  watchUpdates?: UpdateWatcher;
  reload?: () => void;
}

const systemClock = () => new Date();
const randomId = () => crypto.randomUUID();
const systemTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const reloadPage = () => window.location.reload();

export function App({ backend, makePush, clock = systemClock, newId = randomId, deviceTimeZone = systemTimeZone(), watchUpdates, reload = reloadPage }: AppProps) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => backend.auth.onChange(setSession), [backend]);

  const screen = session === undefined ? <Loading />
    : session === null ? <SignIn auth={backend.auth} />
    : <SignedIn key={session.uid} {...{ backend, makePush, clock, newId, deviceTimeZone, session }} />;
  return (
    <>
      {screen}
      {watchUpdates && <UpdateBanner watch={watchUpdates} reload={reload} />}
    </>
  );
}

function SignedIn({ backend, makePush, clock, newId, deviceTimeZone, session }: Required<Omit<AppProps, 'watchUpdates' | 'reload'>> & { session: Session }) {
  const services = useMemo<PlannerServices>(() => {
    const { repository, devices } = backend.open(session);
    return { repository, devices, push: makePush(backend.vapidPublicKey, devices), auth: backend.auth, session, clock, newId };
  }, [backend, makePush, session, clock, newId]);
  return (
    <PlannerProvider services={services} loading={<Loading />}>
      <TimeZoneSync zone={deviceTimeZone} />
      <PushRefresh />
      <Screens />
    </PlannerProvider>
  );
}

/** Reminders are timed in the zone of the device last used. */
function TimeZoneSync({ zone }: { zone: string }) {
  const { state, run } = usePlanner();
  const saved = state.settings.timeZone;
  useEffect(() => {
    if (saved === zone) return;
    const out = setReminder({ timeZone: zone });
    if (out.ok) run(out.changes);
  }, [saved, zone, run]);
  return null;
}

/**
 * Where this device already allows notifications, re-register its subscription
 * at start-up: it may be new to this account, or the browser may have renewed it.
 */
function PushRefresh() {
  const { services } = usePlanner();
  const { push } = services;
  useEffect(() => {
    if (push.status() === 'granted') push.enable().catch(() => {});
  }, [push]);
  return null;
}

function Screens() {
  const { state } = usePlanner();
  return state.settings.birthday ? <Home /> : <Onboarding />;
}
