// @vitest-environment node
import { createECDH, randomBytes } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
// The reference implementation web-push uses, to check our encryption independently.
import ece from 'http_ece';
import { base64UrlDecode, base64UrlEncode, utf8 } from './bytes';
import { encryptPayload, vapidAuthorization, webPushSender } from './webPush';

/** A browser's side of a subscription: its key pair and auth secret. */
function receiver() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = randomBytes(16);
  return { ecdh, keys: { p256dh: base64UrlEncode(ecdh.getPublicKey()), auth: base64UrlEncode(auth) }, auth };
}

/** A VAPID key pair in the base64url form the app stores. */
async function vapidKeys() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey) as ArrayBuffer);
  return { keys: { publicKey: base64UrlEncode(raw), privateKey: jwk.d! }, verifyKey: pair.publicKey };
}

describe('encryptPayload (RFC 8291)', () => {
  it('produces a message the reference implementation decrypts', async () => {
    const r = receiver();
    const body = await encryptPayload(utf8('{"title":"3 deathcookies to eat"}'), r.keys);
    const plain = ece.decrypt(Buffer.from(body), { version: 'aes128gcm', privateKey: r.ecdh, authSecret: r.auth });
    expect(plain.toString('utf8')).toBe('{"title":"3 deathcookies to eat"}');
  });

  it('writes the aes128gcm header: salt, record size, sender key', async () => {
    const r = receiver();
    const salt = new Uint8Array(16).fill(7);
    const body = await encryptPayload(utf8('hi'), r.keys, { salt });
    expect(Array.from(body.slice(0, 16))).toEqual(Array.from(salt));
    expect(new DataView(body.buffer).getUint32(16)).toBe(4096);
    expect(body[20]).toBe(65);
    expect(body[21]).toBe(4); // uncompressed point
  });
});

describe('vapidAuthorization (RFC 8292)', () => {
  it('signs a JWT for the push service that verifies with the public key', async () => {
    const { keys, verifyKey } = await vapidKeys();
    const header = await vapidAuthorization('https://web.push.apple.com/abc/def', 'https://deathcookies-4c3ca.web.app', keys, new Date('2026-10-08T12:00:00Z'));
    const [, token, k] = header.match(/^vapid t=([^,]+), k=(.+)$/)!;
    expect(k).toBe(keys.publicKey);
    const [h, c, s] = token!.split('.');
    const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(c!)));
    expect(claims).toEqual({ aud: 'https://web.push.apple.com', exp: Date.parse('2026-10-08T12:00:00Z') / 1000 + 43200, sub: 'https://deathcookies-4c3ca.web.app' });
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, verifyKey, base64UrlDecode(s!), utf8(`${h}.${c}`));
    expect(ok).toBe(true);
  });
});

describe('webPushSender', () => {
  const subscription = (endpoint: string) => ({ id: 's1', endpoint, keys: receiver().keys });

  it('posts an encrypted, signed message and reads the answer', async () => {
    const { keys } = await vapidKeys();
    const fetchFn = vi.fn(async () => new Response(null, { status: 201 }));
    const result = await webPushSender(keys, 'https://app.example', fetchFn).send(subscription('https://fcm.googleapis.com/x'), { title: 'T', body: 'B' });
    expect(result).toBe('sent');
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://fcm.googleapis.com/x');
    expect(init.headers).toMatchObject({ 'Content-Encoding': 'aes128gcm', TTL: '21600' });
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^vapid t=.+, k=/);
  });

  it('reports dropped subscriptions as gone, and other refusals as failed', async () => {
    const { keys } = await vapidKeys();
    const gone = webPushSender(keys, 'https://app.example', async () => new Response(null, { status: 410 }));
    const refused = webPushSender(keys, 'https://app.example', async () => new Response('bad jwt', { status: 403 }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await gone.send(subscription('https://web.push.apple.com/a'), { title: 'T', body: 'B' })).toBe('gone');
    expect(await refused.send(subscription('https://web.push.apple.com/a'), { title: 'T', body: 'B' })).toBe('failed');
  });
});
