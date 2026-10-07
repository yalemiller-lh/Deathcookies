// Gives screens the current state, today's date and a way to run commands.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Change } from '../domain/changes';
import { startOfDay } from '../domain/dates';
import type { CommandContext, PlannerState } from '../domain/model';
import type { PlannerRepository } from '../data/repository';
import type { AuthService, Session } from '../services/auth';
import type { PushService } from '../services/push';

export interface PlannerServices {
  repository: PlannerRepository;
  push: PushService;
  auth: AuthService;
  session: Session;
  clock: () => Date;
  newId: () => string;
}

interface PlannerValue {
  state: PlannerState;
  today: Date;
  /** Fresh command context (current time, id source). */
  ctx: () => CommandContext;
  run: (changes: readonly Change[]) => void;
  services: PlannerServices;
}

const PlannerContext = createContext<PlannerValue | null>(null);

export function usePlanner(): PlannerValue {
  const value = useContext(PlannerContext);
  if (!value) throw new Error('usePlanner must be used inside PlannerProvider');
  return value;
}

/** Today's date, kept current across midnight and when the app comes back to the foreground. */
function useToday(clock: () => Date): Date {
  const [today, setToday] = useState(() => startOfDay(clock()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      const now = clock();
      setToday(prev => (startOfDay(now).getTime() === prev.getTime() ? prev : startOfDay(now)));
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      clearTimeout(timer);
      timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 1000);
    };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [clock]);
  return today;
}

export function PlannerProvider({ services, children, loading }: { services: PlannerServices; children: ReactNode; loading: ReactNode }) {
  const [state, setState] = useState<PlannerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = useToday(services.clock);

  useEffect(() => services.repository.subscribe(setState, e => setError(e.message)), [services.repository]);

  const run = useCallback((changes: readonly Change[]) => {
    if (changes.length === 0) return;
    services.repository.apply(changes).catch((e: Error) => setError(e.message));
  }, [services.repository]);

  const ctx = useCallback(() => ({ now: services.clock(), newId: services.newId }), [services]);

  const value = useMemo(() => (state ? { state, today, ctx, run, services } : null), [state, today, ctx, run, services]);
  return (
    <>
      {error && (
        <div className="error-bar" role="alert">
          <span>Something did not save: {error}</span>
          <button className="text-btn" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      {value ? <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider> : loading}
    </>
  );
}
