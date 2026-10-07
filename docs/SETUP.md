# Setting up and deploying Deathcookies

Until `src/app/firebaseConfig.ts` has a config, the app runs on on-device
storage only (no sign-in, no sync, no notifications).

## 1. Create the Firebase project (once, in the browser)

Use a **personal** Google account, not a school one.

1. https://console.firebase.google.com → **Add project** (Analytics not needed).
2. Upgrade to the **Blaze** plan (needed for the scheduled reminder) and set a
   budget alert, e.g. $1. One person's use stays inside the free allowance.
3. Build → **Authentication** → Get started → enable **Google**.
4. Build → **Firestore Database** → Create database → production mode.
5. Project settings → **Your apps** → add a **Web** app. Copy its config into
   `firebaseConfig` in `src/app/firebaseConfig.ts`, and set `authDomain` to
   `<project-id>.web.app` (sign-in on iPhone home-screen apps needs the app and
   the sign-in pages on the same domain).
6. Put the project id in `.firebaserc`.

## 2. Sign the Firebase CLI in (once per computer)

```bash
node node_modules/firebase-tools/lib/bin/firebase.js login
```

## 3. Give the reminder sender its private key (once per project)

`functions/.secret.local` holds the Web Push private key (never committed). Its
public half is `vapidPublicKey` in `src/app/firebaseConfig.ts`.

```bash
node node_modules/firebase-tools/lib/bin/firebase.js functions:secrets:set VAPID_PRIVATE_KEY
```

Paste the value after `VAPID_PRIVATE_KEY=` when asked. If the key is ever lost,
generate a new pair, update both halves, and every device re-allows
notifications.

## 4. Check, build and deploy

```bash
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc --noEmit -p functions
node node_modules/eslint/bin/eslint.js .
node node_modules/vitest/vitest.mjs run
node node_modules/vite/bin/vite.js build
node tools/build-functions.mjs
node node_modules/firebase-tools/lib/bin/firebase.js deploy
```

(`npm run deploy` does the same where npm works.)

## 5. Install on the phone

- **iPhone (iOS 16.4+)**: open `https://<project-id>.web.app` in Safari →
  Share → **Add to Home Screen** → open it from the Home Screen → sign in →
  Settings → **Allow notifications on this device**.
- **Android**: open it in Chrome → menu → **Install app** → same steps.
- **Laptop**: open the same address in Chrome or Edge, sign in, and allow
  notifications in Settings if wanted.

Settings → **Send a test notification** pushes the current reminder to every
device that has allowed notifications.
