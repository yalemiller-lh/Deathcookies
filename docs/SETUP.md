# Setting up and deploying Deathcookies

Everything runs on free plans, with no card on file:

- **Firebase (free Spark plan)**: Google sign-in, the Firestore database, and
  hosting of the app.
- **GitHub Actions**: `.github/workflows/reminders.yml` runs `sender/` every
  15 minutes to send the daily reminder. Free while the repository is public.

Until `src/app/firebaseConfig.ts` has a config, the app runs on on-device
storage only (no sign-in, no sync, no notifications).

## 1. Create the Firebase project (once, in the browser)

Use a **personal** Google account, not a school one. Stay on the free
**Spark** plan; there is no need to upgrade.

1. https://console.firebase.google.com → **Add project** (Analytics not needed).
2. Build → **Authentication** → Get started → enable **Google**.
3. Build → **Firestore Database** → Create database → production mode.

## 2. Sign the Firebase CLI in (once per computer)

```bash
node node_modules/firebase-tools/lib/bin/firebase.js login
```

Then (done by Claude): register a web app in the project, copy its config into
`src/app/firebaseConfig.ts` with `authDomain` set to `<project-id>.web.app`
(sign-in on iPhone home-screen apps needs the app and the sign-in pages on the
same domain), and put the project id in `.firebaserc`.

## 3. Give the reminder sender access (once per project)

The sender needs two repository secrets: GitHub → the repository →
**Settings → Secrets and variables → Actions → New repository secret**.

1. **FIREBASE_SERVICE_ACCOUNT**: a key for a service account that can only use
   the database.
   - https://console.cloud.google.com/iam-admin/serviceaccounts → pick the
     Firebase project → **Create service account**, name it
     `deathcookies-reminders`.
   - Role: **Cloud Datastore User** → Done.
   - Open it → **Keys → Add key → Create new key → JSON**. A file downloads.
   - Paste the file's whole contents as the secret, then delete the file.
2. **VAPID_PRIVATE_KEY**: the Web Push private key, in
   `sender/.secret.local` on the computer that set the project up (never
   committed). Paste only the part after `VAPID_PRIVATE_KEY=`. Its public half
   is `vapidPublicKey` in `src/app/firebaseConfig.ts`; if the private key is
   lost, generate a new pair, update both, and every device re-allows
   notifications.

Until both secrets exist, the workflow skips each run quietly.

## 4. Check, build and deploy the app

```bash
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc --noEmit -p sender
node node_modules/eslint/bin/eslint.js .
node node_modules/vitest/vitest.mjs run
node node_modules/vite/bin/vite.js build
node node_modules/firebase-tools/lib/bin/firebase.js deploy
```

(`npm run deploy` does the same where npm works.) This publishes the app and
the database rules. The reminder sender needs no deploy: GitHub runs whatever
is on `main`.

## 5. Install on the phone

- **iPhone (iOS 16.4+)**: open `https://<project-id>.web.app` in **Safari** →
  Share → **Add to Home Screen** → open it from the Home Screen → sign in →
  Settings → switch the daily reminder on → **Allow**.
- **Android**: open it in Chrome → menu → **Install app** → same steps.
- **Laptop**: open the same address in Chrome or Edge and sign in.

## 6. Test a real notification

GitHub → the repository → **Actions → Reminders → Run workflow** (leave
"Send the current reminder now" ticked). Every device that allowed
notifications should get one within a minute. Settings → Daily reminder shows
the date the last scheduled reminder went out.

## Keeping it running

- GitHub may run the schedule a few minutes late. A reminder that cannot go out
  within 3 hours of its time is skipped for that day.
- A weekly keep-alive job stops GitHub disabling the schedule after 60 quiet
  days. If "Last sent" in Settings ever stops moving, check the Actions tab and
  click **Enable workflow** if it was disabled.
- A failed run makes GitHub email the repository owner.
