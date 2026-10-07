import { useEffect, useMemo, useState } from 'react';
import type { Backend } from '../app/backend';
import { setReminder } from '../domain/settings';
import type { Session } from '../services/auth';
import type { PushService } from '../services/push';
import { Home } from './home/Home';
import { PlannerProvider, usePlanner, type PlannerServices } from './PlannerContext';
import { Loading, Onboarding, SignIn } from './Welcome';

export interface AppProps {
  backend: Backend;
  makePush: (vapidPublicKey: string | null, devices: ReturnType<Backend['open']>['devices']) => PushService;
  clock?: () => Date;
  newId?: () => string;
  deviceTimeZone?: string;
}

const systemClock = () => new Date();
const randomId = () => crypto.randomUUID();
const systemTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function App({ backend, makePush, clock = systemClock, newId = randomId, deviceTimeZone = systemTimeZone() }: AppProps) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => backend.auth.onChange(setSession), [backend]);

  if (session === undefined) return <Loading />;
  if (session === null) return <SignIn onSignIn={() => backend.auth.signIn()} />;
  return <SignedIn key={session.uid} {...{ backend, makePush, clock, newId, deviceTimeZone, session }} />;
}

function SignedIn({ backend, makePush, clock, newId, deviceTimeZone, session }: Required<AppProps> & { session: Session }) {
  const services = useMemo<PlannerServices>(() => {
    const { repository, devices } = backend.open(session);
    return { repository, push: makePush(backend.vapidPublicKey, devices), auth: backend.auth, session, clock, newId };
  }, [backend, makePush, session, clock, newId]);
  return (
    <PlannerProvider services={services} loading={<Loading />}>
      <TimeZoneSync zone={deviceTimeZone} />
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

function Screens() {
  const { state } = usePlanner();
  return state.settings.birthday ? <Home /> : <Onboarding />;
}
