import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Backend } from '../app/backend';
import { parseISODate } from '../domain/dates';
import { emptyState, type PlannerState } from '../domain/model';
import { memoryRepository } from '../data/memoryRepository';
import { localDevices } from '../data/localRepository';
import { deviceAuth, type AuthService, type Session } from '../services/auth';
import type { PushService } from '../services/push';
import { App } from './App';

const fakePush: PushService = { status: () => 'unsupported', enable: async () => 'unsupported', showNow: async () => {} };

function setup(patch: Partial<PlannerState> = {}, date = '2026-10-07', birthday: string | null = '2002-05-01') {
  const base = emptyState('UTC');
  const repo = memoryRepository({ ...base, ...patch, settings: { ...base.settings, birthday } });
  const backend: Backend = { auth: deviceAuth, open: () => ({ repository: repo, devices: localDevices }), vapidPublicKey: null, reminders: null };
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
    idToken: async () => null,
    signOut: async () => {},
  };
  return { auth, calls };
}

function renderWithAuth(auth: AuthService) {
  const base = emptyState('UTC');
  const repo = memoryRepository({ ...base, settings: { ...base.settings, birthday: '2002-05-01' } });
  const backend: Backend = { auth, open: () => ({ repository: repo, devices: localDevices }), vapidPublicKey: null, reminders: null };
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
    expect(within(cookies).queryByRole('checkbox', { name: 'Pay the deposit' })).not.toBeInTheDocument();
    expect(within(cookies).getByRole('checkbox', { name: 'Renew the car tax' })).toBeInTheDocument();

    // Cleared, not deleted: the database keeps it with its times.
    const kept = repo.snapshot().cookies.find(c => c.text === 'Pay the deposit');
    const now = parseISODate('2026-10-07').getTime();
    expect(kept).toMatchObject({ done: true, createdAt: now, completedAt: now, clearedAt: now });
  });
});

describe('weeklies', () => {
  it('adds weeklies, ticks them for this week and removes them', async () => {
    const { user, repo } = setup();
    const weeklies = section('Weeklies');
    await user.type(within(weeklies).getByLabelText('New weekly'), 'LinkedIn post{Enter}');
    await user.type(within(weeklies).getByLabelText('New weekly'), 'Substack{Enter}');
    expect(within(weeklies).getByText('0 of 2')).toBeInTheDocument();
    expect(within(weeklies).getByText('Resets Monday, October 12')).toBeInTheDocument();

    await user.click(within(weeklies).getByRole('checkbox', { name: 'Substack' }));
    expect(within(weeklies).getByText('1 of 2')).toBeInTheDocument();
    expect(repo.snapshot().weeklies.find(w => w.text === 'Substack')?.doneWeek).toBe('2026-10-05');

    await user.click(within(weeklies).getByRole('button', { name: 'Remove LinkedIn post' }));
    expect(repo.snapshot().weeklies.map(w => w.text)).toEqual(['Substack']);
  });

  it('shows last week’s ticks as open in a new week', () => {
    setup({ weeklies: [{ id: 'w1', text: 'Call Nan', doneWeek: '2026-09-28', createdAt: 1 }] });
    expect(within(section('Weeklies')).getByRole('checkbox', { name: 'Call Nan' })).toHaveAttribute('aria-checked', 'false');
  });
});

describe('rejection therapy', () => {
  it('opens from the tab bar and submits cards one at a time', async () => {
    const { user, repo } = setup();
    await user.click(screen.getByRole('tab', { name: 'Rejection Therapy' }));
    expect(screen.getByRole('tab', { name: 'Rejection Therapy' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('100 nos to go')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Card No. 01' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByText('2%')).toBeInTheDocument();
    expect(screen.getByText('2 done')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Card No. 03' })).toBeInTheDocument();
    expect(repo.snapshot().rejections.map(r => [r.n, r.date])).toEqual([[1, '2026-10-07'], [2, '2026-10-07']]);
    // Done cards sit at the bottom with their date; upcoming ones above them.
    const rows = within(screen.getByLabelText('All cards')).getAllByText(/^No\. /).map(el => el.textContent);
    expect(rows.slice(0, 2)).toEqual(['No. 04', 'No. 05']);
    expect(rows.slice(-2)).toEqual(['No. 01', 'No. 02']);
    expect(within(screen.getByLabelText('All cards')).getAllByText('Oct 7')).toHaveLength(2);
  });

  it('says so when all hundred are done', async () => {
    const rejections = Array.from({ length: 100 }, (_, i) => ({ id: `no-${i + 1}`, n: i + 1, date: '2026-10-05', createdAt: i }));
    const { user } = setup({ rejections });
    await user.click(screen.getByRole('tab', { name: 'Rejection Therapy' }));
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('All one hundred')).toBeInTheDocument();
    expect(screen.getByText("A hundred no's.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
  });

  it('keeps 1 no to go singular', async () => {
    const rejections = Array.from({ length: 99 }, (_, i) => ({ id: `no-${i + 1}`, n: i + 1, date: '2026-10-05', createdAt: i }));
    const { user } = setup({ rejections });
    await user.click(screen.getByRole('tab', { name: 'Rejection Therapy' }));
    expect(screen.getByText('1 no to go')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Card No. 100' })).toBeInTheDocument();
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
    const backend: Backend = { auth, open: () => ({ repository: repo, devices: localDevices }), vapidPublicKey: null, reminders: null };
    render(<App backend={backend} makePush={() => fakePush} clock={() => parseISODate('2026-10-07')} deviceTimeZone="UTC" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByText('Last sent: Tuesday, October 6')).toBeInTheDocument();
    expect(screen.getByText('me@example.com')).toBeInTheDocument();
  });
});

describe('new version banner', () => {
  it('offers a reload once a newer version is live', async () => {
    const base = emptyState('UTC');
    const repo = memoryRepository({ ...base, settings: { ...base.settings, birthday: '2002-05-01' } });
    const backend: Backend = { auth: deviceAuth, open: () => ({ repository: repo, devices: localDevices }), vapidPublicKey: null, reminders: null };
    let announce = () => {};
    const reload = vi.fn();
    render(<App backend={backend} makePush={() => fakePush} clock={() => parseISODate('2026-10-07')} deviceTimeZone="UTC"
      watchUpdates={onUpdate => { announce = onUpdate; return () => {}; }} reload={reload} />);
    expect(screen.queryByText('A new version is ready.')).not.toBeInTheDocument();
    act(() => announce());
    await userEvent.setup().click(screen.getByRole('button', { name: 'Update' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('quotes', () => {
  function renderQuotes(patch: Partial<PlannerState> = {}, incoming: { text: string; by: string } | null = null) {
    const base = emptyState('UTC');
    const repo = memoryRepository({ ...base, ...patch, settings: { ...base.settings, birthday: '2002-05-01' } });
    const backend: Backend = { auth: deviceAuth, open: () => ({ repository: repo, devices: localDevices }), vapidPublicKey: null, reminders: null };
    let waiting = incoming;
    render(<App backend={backend} makePush={() => fakePush} clock={() => parseISODate('2026-10-07')} deviceTimeZone="UTC"
      incomingQuote={{ peek: () => waiting, clear: () => { waiting = null; }, onArrive: () => () => {} }} />);
    return { repo, user: userEvent.setup() };
  }

  it('saves a typed quote, which then becomes the quote of the day', async () => {
    const { repo, user } = renderQuotes();
    await user.click(screen.getByRole('button', { name: 'Quotes' }));
    expect(screen.getByText(/None yet/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Add a quote' }));
    await user.type(screen.getByLabelText('Quote'), 'Done is better than perfect.');
    await user.type(screen.getByLabelText('By'), 'Sheryl Sandberg');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(repo.snapshot().quotes).toMatchObject([{ text: 'Done is better than perfect.', by: 'Sheryl Sandberg' }]);
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('button', { name: /Quote of the day: Done is better than perfect\./ })).toBeInTheDocument();
  });

  it('opens a quote sent from the Shortcut, ready to check and save', async () => {
    const { repo, user } = renderQuotes({}, { text: 'Well begun is half done.', by: 'Aristotle' });
    expect(screen.getByRole('dialog', { name: 'Words you have kept' })).toBeInTheDocument();
    expect(screen.getByLabelText('Quote')).toHaveValue('Well begun is half done.');
    expect(screen.getByLabelText('By')).toHaveValue('Aristotle');
    expect(screen.getByText('Read from your screenshot. Check it before saving.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(repo.snapshot().quotes).toMatchObject([{ text: 'Well begun is half done.', by: 'Aristotle' }]);
  });

  it('splits a pasted quote into its words and author', async () => {
    const { user } = renderQuotes();
    await user.click(screen.getByRole('button', { name: 'Quotes' }));
    await user.click(screen.getByRole('button', { name: '+ Add a quote' }));
    await user.click(screen.getByLabelText('Quote'));
    await user.paste('“Be one.”\n— Marcus Aurelius');
    expect(screen.getByLabelText('Quote')).toHaveValue('Be one.');
    expect(screen.getByLabelText('By')).toHaveValue('Marcus Aurelius');
  });

  it('edits and removes saved quotes', async () => {
    const { repo, user } = renderQuotes({ quotes: [{ id: 'q1', text: 'Old words', by: '', createdAt: 1 }] });
    await user.click(screen.getByRole('button', { name: 'Quotes' }));
    await user.click(screen.getByRole('button', { name: 'Edit "Old words"' }));
    await user.clear(screen.getByLabelText('Quote'));
    await user.type(screen.getByLabelText('Quote'), 'New words');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(repo.snapshot().quotes).toMatchObject([{ id: 'q1', text: 'New words' }]);
    await user.click(screen.getByRole('button', { name: 'Remove "New words"' }));
    expect(repo.snapshot().quotes).toEqual([]);
  });
});

describe('test notification', () => {
  it('asks the reminder service to send one, and says how it went', async () => {
    const base = emptyState('UTC');
    const repo = memoryRepository({ ...base, settings: { ...base.settings, birthday: '2002-05-01' } });
    const sendTest = vi.fn(async () => ({ sent: 1, failed: 0, removed: 0 }));
    const backend: Backend = { auth: deviceAuth, open: () => ({ repository: repo, devices: localDevices }), vapidPublicKey: 'k', reminders: { sendTest } };
    const grantedPush: PushService = { status: () => 'granted', enable: async () => 'granted', showNow: async () => {} };
    render(<App backend={backend} makePush={() => grantedPush} clock={() => parseISODate('2026-10-07')} deviceTimeZone="UTC" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Send a test notification' }));
    expect(sendTest).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Sent to 1 device. It should arrive in a few seconds.')).toBeInTheDocument();
  });
});
