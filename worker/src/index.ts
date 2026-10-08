// The reminder worker. Every 5 minutes it reminds whoever's time has come;
// POST /test (with the app's sign-in token) sends the caller a test now.
import { firebaseConfig, vapidPublicKey } from '../../src/app/firebaseConfig';
import { firestoreRestStore } from './firestoreRest';
import { DATASTORE_SCOPE, tokenSource, type ServiceAccount } from './googleAuth';
import { verifyIdToken } from './idToken';
import { sendDueReminders, sendToUser } from './reminders';
import { webPushSender } from './webPush';

export interface Env {
  FIREBASE_SERVICE_ACCOUNT: string;
  VAPID_PRIVATE_KEY: string;
}

const projectId = firebaseConfig?.projectId ?? '';
const appOrigin = `https://${firebaseConfig?.authDomain ?? ''}`;

function connect(env: Env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT || !env.VAPID_PRIVATE_KEY || !vapidPublicKey) throw new Error('Worker secrets are not set (see docs/SETUP.md).');
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccount;
  return {
    store: firestoreRestStore(projectId, tokenSource(account, DATASTORE_SCOPE)),
    sender: webPushSender({ publicKey: vapidPublicKey, privateKey: env.VAPID_PRIVATE_KEY.trim() }, appOrigin),
  };
}

function cors(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = origin === appOrigin || /^http:\/\/localhost:\d+$/.test(origin);
  return allowed ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Authorization', Vary: 'Origin' } : {};
}

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil((async () => {
      const { store, sender } = connect(env);
      const report = await sendDueReminders(store, sender, new Date());
      if (report.due > 0 || report.errors > 0) console.log('reminders', JSON.stringify(report));
    })());
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = cors(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/test') return json({ error: 'not found' }, 404, headers);
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    let uid: string;
    try {
      uid = await verifyIdToken(token, projectId, new Date());
    } catch (e) {
      return json({ error: `not signed in: ${(e as Error).message}` }, 401, headers);
    }
    try {
      const { store, sender } = connect(env);
      return json(await sendToUser(store, sender, uid), 200, headers);
    } catch (e) {
      return json({ error: (e as Error).message }, 500, headers);
    }
  },
};
