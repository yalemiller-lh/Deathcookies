# Setting up and deploying Deathcookies

Everything runs on free plans, with no card on file:

- **Firebase (free Spark plan)**: Google sign-in, the Firestore database, and
  hosting of the app.
- **Cloudflare Workers (free plan)**: `worker/` runs every 5 minutes and sends
  the daily reminder to whoever's time has come; it also handles "Send a test
  notification" from Settings.
- **GitHub Actions** (free while the repository is public):
  `.github/workflows/deploy.yml` checks, builds and publishes the app whenever
  app code reaches `main`.

Until `src/app/firebaseConfig.ts` has a config, the app runs on on-device
storage only (no sign-in, no sync, no notifications).

## 1. Create the Firebase project (once, in the browser)

Use a **personal** Google account, not a school one. Stay on the free
**Spark** plan; there is no need to upgrade.

1. https://console.firebase.google.com → **Add project** (Analytics not needed).
2. Build → **Authentication** → Get started → enable **Google**, and also
   **Email/Password** (the iPhone app signs in with a password; see below).
3. Build → **Firestore Database** → Create database → production mode.
4. Google Cloud console → APIs & Services → Credentials → **Web client (auto
   created by Google Service)** → add `https://<project-id>.web.app` to
   Authorized JavaScript origins and
   `https://<project-id>.web.app/__/auth/handler` to Authorized redirect URIs.
   (Needed because sign-in runs on the `web.app` address.)

## 2. Sign the Firebase CLI in (once per computer)

```bash
node node_modules/firebase-tools/lib/bin/firebase.js login
```

Then (done by Claude): register a web app in the project, copy its config into
`src/app/firebaseConfig.ts` with `authDomain` set to `<project-id>.web.app`
(sign-in on iPhone home-screen apps needs the app and the sign-in pages on the
same domain), and put the project id in `.firebaserc`.

## 3. Create the service-account key (once per project)

One key, used by the reminder worker (database access) and by the automatic
deploy (publishing the site).

1. https://console.cloud.google.com/iam-admin/serviceaccounts → pick the
   Firebase project → **Create service account**, name it `deathcookies-github`.
2. Roles: **Cloud Datastore User**, then **+ Add another role** →
   **Firebase Hosting Admin** → Done.
3. Open it → **Keys → Add key → Create new key → JSON**. A file downloads.
4. GitHub → the repository → **Settings → Secrets and variables → Actions →
   New repository secret**: name `FIREBASE_SERVICE_ACCOUNT`, value = the file's
   whole contents. (Until it exists, the Deploy workflow skips quietly.)
5. Give the same file to the worker (step 4), then delete the downloaded file.

## 4. Set up the reminder worker (once)

1. Create a free Cloudflare account at https://dash.cloudflare.com/sign-up.
2. Sign Wrangler in:
   ```bash
   node worker/node_modules/wrangler/bin/wrangler.js login
   ```
3. Deploy, then give it its two secrets (PowerShell):
   ```powershell
   node worker/node_modules/wrangler/bin/wrangler.js deploy --config worker/wrangler.toml
   Get-Content "<downloaded key>.json" -Raw | node worker/node_modules/wrangler/bin/wrangler.js secret put FIREBASE_SERVICE_ACCOUNT --config worker/wrangler.toml
   ```
   `VAPID_PRIVATE_KEY` is the Web Push private key in `worker/.secret.local`
   (never committed; the part after `VAPID_PRIVATE_KEY=`). Its public half is
   `vapidPublicKey` in `src/app/firebaseConfig.ts`. If the private key is lost,
   generate a new pair, update both, and every device re-allows notifications.
4. Put the worker's address (`https://deathcookies-reminders.<subdomain>.workers.dev`)
   in `reminderServiceUrl` in `src/app/firebaseConfig.ts` and deploy the app.

Worker logs: `node worker/node_modules/wrangler/bin/wrangler.js tail --config worker/wrangler.toml`.
The worker is deployed by hand when `worker/` changes (the GitHub deploy
publishes the app only).

## 5. Check, build and deploy the app

Pushing app code to `main` does this automatically (Actions → **Deploy**), and
a running app shows "A new version is ready" with an **Update** button once the
new build is live. To deploy by hand from this computer instead:

```bash
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc --noEmit -p worker
node node_modules/eslint/bin/eslint.js .
node node_modules/vitest/vitest.mjs run
node node_modules/vite/bin/vite.js build
node node_modules/firebase-tools/lib/bin/firebase.js deploy
```

(`npm run deploy` does the same where npm works.) This publishes the app and
the database rules. **The automatic deploy publishes the app only**: after
changing `firestore.rules`, deploy the rules by hand with
`firebase deploy --only firestore`.

## 6. Install on the phone

- **iPhone (iOS 16.4+)**: open `https://<project-id>.web.app` in **Safari** →
  Share → **Add to Home Screen** → open it from the Home Screen. Google sign-in
  cannot finish on iPhone, so first set a password on a computer (Settings →
  Account → **Set a password**), then sign in on the iPhone with your Gmail
  address and that password. Then Settings → switch the daily reminder on →
  **Allow**.
- **Android**: open it in Chrome → menu → **Install app** → same steps.
- **Laptop**: open the same address in Chrome or Edge and sign in with Google.

## 7. Save quotes from screenshots (iPhone, optional)

Apple lets only App Store apps into the Share menu, so an iOS Shortcut sends a
screenshot's text to Deathcookies. Set it up once in the **Shortcuts** app
(the same steps are in the app: Quotes → Save quotes from screenshots). The
finished shortcut has five blocks:

```
Receive [Images] from [Share Sheet]
Extract text from [Shortcut Input]
URL [Encode] [Text from Image]
Text  https://<project-id>.web.app/#quote=[URL Encoded Text]
Open [Text]
```

Screenshot → Share → **Save to Deathcookies** opens the app in Safari with the
quote and author filled in, to check and save. The text travels after the
`#`, so it is never sent to a server. Signing in in Safari is needed once.

## 8. Test a real notification

Settings → This device → **Send a test notification**. Every device that
allowed notifications should get one within seconds. Settings → Daily
reminder shows the date the last scheduled reminder went out.

## Keeping it running

- The worker runs every 5 minutes, so a reminder arrives within 5 minutes of
  its time. One that cannot go out within an hour is skipped for that day.
- If "Last sent" in Settings stops moving, check the worker's logs (above) or
  the Cloudflare dashboard → Workers → deathcookies-reminders.
