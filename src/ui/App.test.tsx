import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Backend } from '../app/backend';
import { parseISODate } from '../domain/dates';
import { emptyState, type PlannerState } from '../domain/model';
import { memoryRepository } from '../data/memoryRepository';
import { localDevices } from '../data/localRepository';
import { deviceAuth, type AuthService, type Session } from '../services/auth';
import type { PushService } from '../services/push';
import { priority } from '../test/fixtures';
import { App } from './App';

const fakePush: PushService = { status: () => 'unsupported', enable: async () => 'unsupported', showNow: async () => {} };

function setup(patch: Partial<PlannerState> = {}, date = '2026-10-07', birthday: string | null = '2002-05-01') {
  const base = emptyState('UTC');
  const repo = memoryRepository({ ...base, ...patch, settings: { ...base.settings, birthday } });
  const backend: Backend = { auth: deviceAuth, open: () => ({ repository: repo, devices: localDevices }), vapidPublicKey: null };
  let n = 0;
  render(<App backend={backend} makePush={() => fakePush} clock={() => parseISODate(date)} newId={() => `new${++n}`} deviceTimeZone="UTC" />);
  return { repo, user: userEvent.setup() };
}

const section = (name: string) => screen.getByRole('region', { name });

/** A signed-in-capable account; the password 'right' is the only one that works. */
function fakeGoogleAuth({ googleAvailable = true, session = null }: { googleAvailable?: boolean; session?: Session | null }) {
  const calls = { passwordSignIns: [] as string[][], passwordsSet: [] as string[] };
  const auth: AuthService = {
    kind: 'google',
    googleAvailable,
    onChange: listener => { listener(session); return () => {}; },
    signIn: async () => {},
    signInWithPassword: async (email, password) => {
      calls.passwordSignIns.push([email, password]);
      if (password !== 'right') throw new Error('That email and password do not match.');
    },
    setPassword: async password => { calls.passwordsSet.push(password); },
    signOut: async () => {},
  };
  return { auth, calls };
}

function renderWithAuth(auth: AuthService) {
  const base = emptyState('UTC');
  const repo = memoryRepository({ ...base, settings: { ...base.settings, birthday: '2002-05-01' } });
  const backend: Backend = { auth, open: () => ({ repository: repo, devices: localDevices }), vapidPublicKey: null };
  render(<App backend={backend} makePush={() => fakePush} clock={() => parseISODate('2026-10-07')} deviceTimeZone="UTC" />);
  return userEvent.setup();
}

describe('signing in', () => {
  it('offers Google on a computer, with email and password as an alternative', async () => {
    const { auth } = fakeGoogleAuth({});
    const user = renderWithAuth(auth);
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Use email and password instead' }));
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('goes straight to email and password in the Home Screen app, and explains why', async () => {
    const { auth, calls } = fakeGoogleAuth({ googleAvailable: false });
    const user = renderWithAuth(auth);
    expect(screen.queryByRole('button', { name: 'Sign in with Google' })).not.toBeInTheDocument();
    expect(screen.getByText(/Google sign-in does not work on this phone/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'me@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That email and password do not match.');
    expect(calls.passwordSignIns).toEqual([['me@example.com', 'wrong']]);
  });
});

describe('setting a password', () => {
  it('checks the two entries match, then adds the password to the account', async () => {
    const { auth, calls } = fakeGoogleAuth({ session: { uid: 'u1', email: 'me@example.com', hasPassword: false } });
    const user = renderWithAuth(auth);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Set a password' }));
    await user.type(screen.getByLabelText('New password'), 'secret1');
    await user.type(screen.getByLabelText('Same password again'), 'secret2');
    await user.click(screen.getByRole('button', { name: 'Save password' }));
    expect(screen.getByRole('alert')).toHaveTextContent('The two passwords do not match.');
    expect(calls.passwordsSet).toEqual([]);

    await user.clear(screen.getByLabelText('Same password again'));
    await user.type(screen.getByLabelText('Same password again'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Save password' }));
    expect(await screen.findByText('Password set. On the iPhone app, sign in with me@example.com and that password.')).toBeInTheDocument();
    expect(calls.passwordsSet).toEqual(['secret1']);
  });

  it('just confirms when the account already has one', async () => {
    const { auth } = fakeGoogleAuth({ session: { uid: 'u1', email: 'me@example.com', hasPassword: true } });
    const user = renderWithAuth(auth);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.queryByRole('button', { name: 'Set a password' })).not.toBeInTheDocument();
    expect(screen.getByText(/Password set/)).toBeInTheDocument();
  });
});

describe('onboarding', () => {
  it('asks for a birthday, previews the quarter, then shows the home screen', async () => {
    const { user, repo } = setup({}, '2026-10-07', null);
    const input = screen.getByLabelText('Birthday');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.type(input, '2002-05-01');
    expect(screen.getByText('Today falls in Year 24 · Quarter 2 · August 1 – October 31, 2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(repo.snapshot().settings.birthday).toBe('2002-05-01');
    expect(screen.getByText('Year 24 · Quarter 2')).toBeInTheDocument();
    expect(screen.getByText('Week 10 of 14 · 4 weeks left')).toBeInTheDocument();
  });
});

describe('deathcookies', () => {
  it('adds, ticks off and clears', async () => {
    const { user, repo } = setup();
    const cookies = section('Deathcookies');
    await user.type(within(cookies).getByLabelText('New deathcookie'), 'Pay the deposit{Enter}');
    await user.type(within(cookies).getByLabelText('New deathcookie'), 'Renew the car tax{Enter}');
    expect(within(cookies).getByText('2 open')).toBeInTheDocument();

    await user.click(within(cookies).getByRole('checkbox', { name: 'Pay the deposit' }));
    expect(within(cookies).getByText('1 open')).toBeInTheDocument();
    await user.click(within(cookies).getByRole('button', { name: 'Clear the done ones' }));
    expect(repo.snapshot().cookies.map(c => c.text)).toEqual(['Renew the car tax']);
  });
});

describe('priorities', () => {
  it('creates a priority with a category, and requires a title', async () => {
    const { user, repo } = setup();
    await user.click(screen.getByRole('button', { name: '+ First priority for this quarter' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Give it a title first, even a rough one.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Priority title'), 'Keep running');
    await user.click(screen.getByRole('radio', { name: 'health' }));
    await user.type(screen.getByLabelText('Why it matters'), 'Clear head');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(repo.snapshot().priorities).toMatchObject([{ title: 'Keep running', category: 'health', why: 'Clear head', status: 'active' }]);
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Priority · room for 2 more' })).toBeInTheDocument();
  });

  it('expands a card, adds a project and logs activity on it', async () => {
    const { user, repo } = setup({ priorities: [priority('p1', { title: 'Studio' })] });
    await user.click(screen.getByRole('button', { name: /Studio/ }));
    expect(screen.getByText('No projects connected yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Project' }));
    await user.type(screen.getByLabelText('Project name'), 'Electrics{Enter}');
    await user.click(screen.getByRole('button', { name: /Electrics\. Quiet last week/ }));
    await user.type(screen.getByLabelText('Log something on Electrics'), 'Sockets wired{Enter}');
    expect(screen.getByText('WED · Sockets wired')).toBeInTheDocument();
    expect(repo.snapshot().activity).toMatchObject([{ text: 'Sockets wired', date: '2026-10-07' }]);
  });
});

describe('backburner', () => {
  it('promotes an idea by setting a priority aside, then opens it for editing', async () => {
    const { user, repo } = setup({
      priorities: [priority('a', { title: 'Alpha' }), priority('b', { title: 'Beta' }), priority('c', { title: 'Gamma' })],
      backburner: [{ id: 'i1', text: 'Woodworking course', date: '2026-10-03', createdAt: 1 }],
    });
    await user.click(screen.getByRole('button', { name: 'Make "Woodworking course" a priority' }));
    const dialog = screen.getByRole('dialog', { name: 'Woodworking course' });
    await user.click(within(dialog).getByRole('button', { name: /Beta/ }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Pick a category and write down why it matters while it is fresh.')).toBeInTheDocument();
    expect(within(section('Set aside')).getByText('Beta')).toBeInTheDocument();
    expect(within(section('Set aside')).getByRole('button', { name: 'No room yet' })).toBeDisabled();
    expect(repo.snapshot().backburner).toEqual([]);
  });
});

describe('quarter review', () => {
  it('appears in the last two weeks and closes the quarter', async () => {
    const { user, repo } = setup({ priorities: [priority('a', { title: 'Alpha' }), priority('b', { title: 'Beta' })] }, '2026-10-29');
    await user.click(screen.getByRole('button', { name: /Quarter 2 closes Saturday, October 31/ }));
    const dialog = screen.getByRole('dialog', { name: 'Looking back on quarter 2' });
    await user.click(within(dialog).getAllByRole('radio', { name: 'retire' })[1]!);
    expect(within(dialog).getByText('1 continue · 0 adjust · 1 retire')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Close Q2 · begin Q3' }));

    expect(screen.getByText('Quarter 2 is closed.')).toBeInTheDocument();
    expect(screen.getByText('Quarter 3 begins November 1 with 1 priority carried forward. Choose the rest when you are ready.')).toBeInTheDocument();
    expect(screen.getByText('Year 24 · Quarter 3')).toBeInTheDocument();
    expect(screen.getByText('Quarter begins in 1 week')).toBeInTheDocument();
    expect(repo.snapshot().priorities.map(p => p.title)).toEqual(['Alpha']);
  });

  it('is hidden earlier in the quarter', () => {
    setup({}, '2026-10-07');
    expect(screen.queryByRole('button', { name: /closes/ })).not.toBeInTheDocument();
  });
});

describe('settings', () => {
  it('switches the daily reminder on and changes its time', async () => {
    const { user, repo } = setup();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('switch', { name: 'How many deathcookies are left' }));
    expect(repo.snapshot().settings.notificationsOn).toBe(true);
    expect(screen.getByText(/Every day at 8:30 am/)).toBeInTheDocument();
  });

  it('shows when the last reminder went out, for a signed-in account', async () => {
    const base = emptyState('UTC');
    const repo = memoryRepository({ ...base, settings: { ...base.settings, birthday: '2002-05-01', notificationsOn: true, lastReminderDate: '2026-10-06' } });
    const { auth } = fakeGoogleAuth({ session: { uid: 'u1', email: 'me@example.com', hasPassword: false } });
    const backend: Backend = { auth, open: () => ({ repository: repo, devices: localDevices }), vapidPublicKey: null };
    render(<App backend={backend} makePush={() => fakePush} clock={() => parseISODate('2026-10-07')} deviceTimeZone="UTC" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByText('Last sent: Tuesday, October 6')).toBeInTheDocument();
    expect(screen.getByText('me@example.com')).toBeInTheDocument();
  });
});
