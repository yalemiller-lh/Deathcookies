// @vitest-environment node
import { generateKeyPairSync } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { base64UrlDecode, base64UrlEncode, base64UrlJson, utf8 } from './bytes';
import { firestoreRestStore } from './firestoreRest';
import { DATASTORE_SCOPE, signedAssertion, tokenSource } from './googleAuth';
import { resetSigningKeys, verifyIdToken } from './idToken';

const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
const account = { client_email: 'sender@proj.iam.gserviceaccount.com', project_id: 'proj', private_key: rsa.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('service-account tokens', () => {
  it('signs an assertion Google can check with the account public key', async () => {
    const jwt = await signedAssertion(account, DATASTORE_SCOPE, new Date('2026-10-08T12:00:00Z'));
    const [h, c, s] = jwt.split('.');
    const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(c!)));
    expect(claims).toMatchObject({ iss: account.client_email, scope: DATASTORE_SCOPE, aud: 'https://oauth2.googleapis.com/token' });
    expect(claims.exp - claims.iat).toBe(3600);
    const pub = await crypto.subtle.importKey('spki', rsa.publicKey.export({ type: 'spki', format: 'der' }), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    expect(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pub, base64UrlDecode(s!), utf8(`${h}.${c}`))).toBe(true);
  });

  it('fetches a token once and reuses it', async () => {
    const fetchFn = vi.fn(async () => json({ access_token: 'tok', expires_in: 3600 }));
    const token = tokenSource(account, DATASTORE_SCOPE, fetchFn);
    expect(await token()).toBe('tok');
    expect(await token()).toBe('tok');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe('firestoreRestStore', () => {
  const root = 'https://firestore.googleapis.com/v1/projects/proj/databases/(default)/documents';
  const doc = (path: string, fields: object) => ({ name: `projects/proj/databases/(default)/documents/${path}`, fields });

  function fakeFirestore() {
    const calls: { method: string; url: string; body?: unknown }[] = [];
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ method: init?.method ?? 'GET', url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.endsWith(':runQuery')) return json([{ document: doc('users/u1', { notificationsOn: { booleanValue: true }, notificationTime: { stringValue: '07:45' }, timeZone: { stringValue: 'America/New_York' }, lastReminderDate: { stringValue: '2026-10-07' } }) }, { readTime: 'x' }]);
      if (url.includes('/cookies?')) return json({ documents: [doc('users/u1/cookies/c1', { text: { stringValue: 'Pay' }, done: { booleanValue: false }, createdAt: { timestampValue: '2026-10-07T12:00:00Z' }, completedAt: { nullValue: null }, clearedAt: { nullValue: null } })] });
      if (url.includes('/pushSubscriptions?')) return json({ documents: [doc('users/u1/pushSubscriptions/s1', { endpoint: { stringValue: 'https://web.push.apple.com/x' }, keys: { mapValue: { fields: { p256dh: { stringValue: 'P' }, auth: { stringValue: 'A' } } } } })] });
      return json({});
    });
    return { calls, store: firestoreRestStore('proj', async () => 'tok', fetchFn as unknown as typeof fetch) };
  }

  it('finds people with reminders on, with their time, zone and last reminder', async () => {
    const { store, calls } = fakeFirestore();
    expect(await store.usersWithRemindersOn()).toEqual([{ uid: 'u1', settings: { notificationsOn: true, notificationTime: '07:45', timeZone: 'America/New_York' }, lastReminderDate: '2026-10-07' }]);
    expect(calls[0]).toMatchObject({ method: 'POST', url: `${root}:runQuery` });
  });

  it('reads deathcookies through the app mapping and subscriptions with their keys', async () => {
    const { store } = fakeFirestore();
    expect(await store.cookies('u1')).toEqual([{ id: 'c1', text: 'Pay', done: false, createdAt: Date.parse('2026-10-07T12:00:00Z'), completedAt: null, clearedAt: null }]);
    expect(await store.subscriptions('u1')).toEqual([{ id: 's1', endpoint: 'https://web.push.apple.com/x', keys: { p256dh: 'P', auth: 'A' } }]);
  });

  it('records the day sent, and deletes dead subscriptions', async () => {
    const { store, calls } = fakeFirestore();
    await store.markSent('u1', '2026-10-08');
    await store.removeSubscription('u1', 's1');
    expect(calls).toEqual([
      { method: 'PATCH', url: `${root}/users/u1?updateMask.fieldPaths=lastReminderDate`, body: { fields: { lastReminderDate: { stringValue: '2026-10-08' } } } },
      { method: 'DELETE', url: `${root}/users/u1/pushSubscriptions/s1`, body: undefined },
    ]);
  });
});

describe('verifyIdToken', () => {
  const now = new Date('2026-10-08T12:00:00Z');
  const t = now.getTime() / 1000;
  const jwk = { ...(rsa.publicKey.export({ format: 'jwk' }) as JsonWebKey), kid: 'k1', alg: 'RS256' };
  const keysFetch = vi.fn(async () => json({ keys: [jwk] }));

  async function token(claims: object, kid = 'k1') {
    const unsigned = `${base64UrlJson({ alg: 'RS256', kid, typ: 'JWT' })}.${base64UrlJson(claims)}`;
    const key = await crypto.subtle.importKey('pkcs8', rsa.privateKey.export({ type: 'pkcs8', format: 'der' }), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    return `${unsigned}.${base64UrlEncode(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, utf8(unsigned)))}`;
  }
  const good = { aud: 'proj', iss: 'https://securetoken.google.com/proj', sub: 'u1', iat: t - 60, exp: t + 3000 };

  beforeEach(() => resetSigningKeys());

  it('accepts a valid token and returns the uid', async () => {
    expect(await verifyIdToken(await token(good), 'proj', now, keysFetch)).toBe('u1');
  });

  it('refuses tokens for another project, expired ones, and forged ones', async () => {
    await expect(verifyIdToken(await token({ ...good, aud: 'other' }), 'proj', now, keysFetch)).rejects.toThrow('another project');
    await expect(verifyIdToken(await token({ ...good, exp: t - 1 }), 'proj', now, keysFetch)).rejects.toThrow('expired');
    const forged = (await token(good)).replace(/\.[^.]+$/, '.' + base64UrlEncode(new Uint8Array(256)));
    await expect(verifyIdToken(forged, 'proj', now, keysFetch)).rejects.toThrow('bad signature');
    await expect(verifyIdToken(await token(good, 'nope'), 'proj', now, keysFetch)).rejects.toThrow('unknown signing key');
  });
});
