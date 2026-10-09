# Deathcookies — build plan

Source of truth for look and behaviour: the design handoff (`docs/design/`).
Working rules: `docs/agent.md`.

## What the app is (since the 2026-10-09 handoff)

Two tabs, switched by a bottom tab bar:

- **Today**: date, year/quarter and week line, quote of the day, Deathcookies
  (urgent to-dos, kept with created/completed/cleared times), and **Weeklies**
  (a recurring checklist whose ticks clear every Monday).
- **Rejection Therapy**: 100 numbered cards, done one at a time.

Plus Quotes (saved quotes, also from screenshots via an iOS Shortcut),
Settings, and the daily reminder. Priorities, projects, the backburner and the
quarter review were removed in that update; their Firestore documents were left
in place (no longer read), so the change can be undone without data loss.

## Requirements

- Runs on a phone **and** a laptop, with the same data on both.
- Sends a daily notification ("3 deathcookies to eat").
- Data lives in a hosted database that every device reads from and writes to.

## Architecture

One web app (a PWA) that installs to the phone's home screen and opens in any
laptop browser, backed by Firebase.

| Concern | Choice | Why |
| --- | --- | --- |
| App | React + TypeScript + Vite, installable PWA | One codebase for phone and laptop; testable on this PC |
| Sign-in | Firebase Auth, Google account | Same data on every device; no passwords to manage |
| Database | Cloud Firestore | Hosted; syncs phone ⇄ laptop live; keeps working offline and catches up |
| Hosting | Firebase Hosting, published by `.github/workflows/deploy.yml` on every push to main | Serves the app and sign-in pages from one domain; open apps offer "Update" when a newer build is live |
| Notifications | Standard Web Push (VAPID), sent by a Cloudflare Worker (`worker/`) every 5 min | Works on iPhone (home-screen app, iOS 16.4+), Android, and desktop Chrome/Edge |

**Everything runs on free plans with no card on file** (decided 2026-10-07):
Firebase's free Spark plan for sign-in, database and hosting, and a Cloudflare
Worker (free plan) for the reminder. Firebase's own scheduled functions need
the paid plan.

The reminder first ran on a GitHub Actions schedule, but GitHub ran the
15-minute schedule only three times in 15 hours (2026-10-08), so it moved to a
Cloudflare cron trigger every 5 minutes. The worker uses Web Crypto only
(RFC 8291 encryption, RFC 8292 VAPID, a service-account JWT for the Firestore
REST API), since the Node libraries do not run on Workers. Its service account
is limited to the database (Cloud Datastore User) plus Firebase Hosting Admin
for the GitHub deploy, not an admin key.

### Layers (one direction only: UI → state → domain; data adapters behind an interface)

```
src/
  domain/      Pure TypeScript. No React, no Firebase.
               model.ts      entity types
               dates.ts      birthday year, quarters, week line, Mondays
               cookies.ts, weeklies.ts, rejections.ts, quotes.ts, settings.ts   rules
               changes.ts    Change type + applyChanges()
               reminder.ts   notification text + "is it due now?" (shared with the server)
  data/        Persistence behind PlannerRepository { subscribe, apply(changes) }.
               memoryRepository.ts      tests + local dev
               firestoreRepository.ts   the real database
  services/    auth.ts, push.ts (browser push subscription)
  ui/          React components. Calls domain commands, hands the resulting
               Change[] to the repository. Never imports Firebase.
worker/        The reminder sender, a Cloudflare Worker (every 5 min, plus POST /test
               for Settings). Bundles src/domain/reminder.ts so the wording is
               defined once.
public/        manifest, icons, service worker (offline shell + push display)
```

Domain commands take the current state and return a list of `Change`s
(`put` / `delete` a document, `patch` settings). The repository applies a list
atomically (a Firestore batched write), so a multi-step action never half-applies.

- **Weeklies reset rule**: each item stores `doneWeek`, the Monday of the week it
  was ticked (local time, weeks start Monday). It counts as done only while
  `doneWeek === mondayOf(today)`, so nothing has to run on Monday.
- **Rejection cards**: the next card is `max(n) + 1`, and a card's document id is
  its number (`no-003`), so two devices doing the same card write one document.

### Firestore layout

```
users/{uid}                     settings: birthday, timeZone, notificationsOn,
                                notificationTime, lastReminderDate
users/{uid}/cookies/{id}        text, done, createdAt, completedAt, clearedAt (never deleted;
                                cleared ones are hidden from the list). Times are timestamps.
users/{uid}/weeklies/{id}       text, doneWeek (ISO Monday | null), createdAt
users/{uid}/rejections/{id}     n (1–100), date, createdAt; id = no-NNN
users/{uid}/quotes/{id}         text, by, createdAt — the quote of the day rotates through
                                these (classics only while there are none)
users/{uid}/pushSubscriptions/{id}  endpoint, keys, createdAt
```

Security rules: a signed-in user can read and write only `users/{their uid}/**`.

No longer read (left in place by the 2026-10-09 update): `priorities`,
`projects`, `activity`, `backburner`, `quarterReviews`, and the
`closedQuarterKeys` field.

## Additions the handoff asks for (not in the prototype)

- **Settings sheet**: birthday (the prototype's birthday sheet), daily reminder
  on/off and time, "turn on notifications on this device", sign out. Entry
  point: a `SETTINGS` text button at the foot of the home screen.
- **Onboarding**: first sign-in asks for the birthday.
- Starts empty: the prototype's sample content is placeholder data.

Not built (dead logic in the first prototype): weekly Monday review,
past-reviews screen, backburner "flag for review".

## Testing

- Unit (Vitest): all domain rules and date math.
- Repository contract tests: run against the memory adapter. The Firestore
  emulator needs Java, which is not installed on this PC; until it is, the
  Firestore adapter is checked by hand against the real project.
- UI (Vitest + Testing Library): main flows against the memory repository.
- `tsc --noEmit` and ESLint on every change.
- Browser check of the running app at phone and laptop widths.

## Phases (each ends with tests passing and a commit)

1. Scaffold: Vite, TypeScript, Vitest, ESLint.
2. Domain: dates and quarters.
3. Domain: planner rules, changes, reminder text and timing.
4. Data: repository interface, memory adapter, contract tests.
5. UI: home screen, sheets, settings, to the design spec.
6. PWA: manifest, icon, service worker.
7. Firebase: sign-in, Firestore adapter, security rules, hosting.
8. Notifications: push subscription in the app, scheduled sender on Cloudflare Workers.
9. Deploy; install on phone; check laptop.

Phases 1–6 need no accounts. Phases 7–9 need the Firebase project; see docs/SETUP.md.
