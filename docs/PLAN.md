# Deathcookies — build plan

Source of truth for look and behaviour: the design handoff (`docs/design/`).
Working rules: `docs/agent.md`.

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
               dates.ts      birthday year, quarters, week line
               planner.ts    entity types, rules (max 3 priorities, promote, close quarter …)
               changes.ts    Change type + applyChanges()
               reminder.ts   notification text + "is it due now?" (shared with the server)
               quotes.ts
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
atomically (a Firestore batched write), so multi-step actions such as closing a
quarter or promoting an idea never half-apply.

### Firestore layout

```
users/{uid}                     settings: birthday, timeZone, notificationsOn,
                                notificationTime, closedQuarterKeys, lastReminderDate
users/{uid}/cookies/{id}        text, done, createdAt, completedAt, clearedAt (never deleted;
                                cleared ones are hidden from the list). Times are timestamps.
users/{uid}/priorities/{id}     title, category, why, progress, status, adjust?, createdAt
users/{uid}/projects/{id}       name, priorityId | null, createdAt
users/{uid}/activity/{id}       date, text, projectId
users/{uid}/backburner/{id}     text, date, createdAt
users/{uid}/quarterReviews/{id} date, quarterKey, decisions[]
users/{uid}/quotes/{id}         text, by, createdAt — the quote of the day rotates through
                                these (classics only while there are none)
users/{uid}/pushSubscriptions/{id}  endpoint, keys, createdAt
```

Security rules: a signed-in user can read and write only `users/{their uid}/**`.

## Additions the handoff asks for (not in the prototype)

- **Settings sheet**: birthday (the prototype's birthday sheet), daily reminder
  on/off and time, "turn on notifications on this device", sign out. Entry
  point: a `SETTINGS` text button at the foot of the home screen.
- **Onboarding**: first sign-in asks for the birthday.
- **Logging activity**: tap a project card → inline "Log something" field.
  Drives the "last activity" line (`THU · 5 km in the rain`; nothing in the past
  7 days → `Quiet last week`).
- Starts empty: the prototype's sample content is placeholder data.

Not built (dead logic in the prototype): weekly Monday review, past-reviews
screen, backburner "flag for review".

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
