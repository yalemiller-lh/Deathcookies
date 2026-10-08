// Standard Web Push with Web Crypto only (no Node libraries), so it runs on
// Cloudflare Workers: payload encryption per RFC 8291 (aes128gcm) and the
// VAPID sender signature per RFC 8292.
import type { ReminderMessage } from '../../src/domain/reminder';
import { base64UrlDecode, base64UrlEncode, base64UrlJson, concat, utf8 } from './bytes';
import type { PushSender, SendResult, StoredSubscription } from './reminders';

export interface VapidKeys {
  /** Uncompressed P-256 public key (65 bytes), base64url. */
  publicKey: string;
  /** P-256 private scalar (32 bytes), base64url. */
  privateKey: string;
}

const RECORD_SIZE = 4096;

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, length: number): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
}

/**
 * Encrypts one push message for a subscription (a single aes128gcm record).
 * `salt` and `senderKeys` are only passed in by tests.
 */
export async function encryptPayload(
  plaintext: Uint8Array<ArrayBuffer>,
  subscriptionKeys: { p256dh: string; auth: string },
  options: { salt?: Uint8Array<ArrayBuffer>; senderKeys?: CryptoKeyPair } = {},
): Promise<Uint8Array<ArrayBuffer>> {
  const receiverPublic = base64UrlDecode(subscriptionKeys.p256dh);
  const authSecret = base64UrlDecode(subscriptionKeys.auth);
  const senderKeys = options.senderKeys
    ?? (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const senderPublic = new Uint8Array(await crypto.subtle.exportKey('raw', senderKeys.publicKey) as ArrayBuffer);
  const receiverKey = await crypto.subtle.importKey('raw', receiverPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  // Workers' type definitions call this field `$public`, but the runtime (like the standard) requires `public`.
  const ecdh = { name: 'ECDH', public: receiverKey } as unknown as SubtleCryptoDeriveKeyAlgorithm;
  const shared = new Uint8Array(await crypto.subtle.deriveBits(ecdh, senderKeys.privateKey, 256));

  const ikm = await hkdf(authSecret, shared, concat(utf8('WebPush: info\0'), receiverPublic, senderPublic), 32);
  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const contentKey = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12);

  const aes = await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt']);
  // One record: the message, then the 0x02 "last record" delimiter.
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(plaintext, new Uint8Array([2]))));
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, RECORD_SIZE);
  return concat(salt, recordSize, new Uint8Array([senderPublic.length]), senderPublic, ciphertext);
}

async function importVapidKey(keys: VapidKeys): Promise<CryptoKey> {
  const pub = base64UrlDecode(keys.publicKey);
  return crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256', d: keys.privateKey,
    x: base64UrlEncode(pub.slice(1, 33)), y: base64UrlEncode(pub.slice(33, 65)),
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

/** The Authorization header that proves the push comes from this app (valid 12 hours). */
export async function vapidAuthorization(endpoint: string, subject: string, keys: VapidKeys, now: Date): Promise<string> {
  const claims = { aud: new URL(endpoint).origin, exp: Math.floor(now.getTime() / 1000) + 12 * 3600, sub: subject };
  const unsigned = `${base64UrlJson({ typ: 'JWT', alg: 'ES256' })}.${base64UrlJson(claims)}`;
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await importVapidKey(keys), utf8(unsigned));
  return `vapid t=${unsigned}.${base64UrlEncode(signature)}, k=${keys.publicKey}`;
}

/** Sends reminders by Web Push. `subject` is the app's address, which push services may use to contact the sender. */
export function webPushSender(keys: VapidKeys, subject: string, fetchFn: typeof fetch = fetch): PushSender {
  return {
    async send(subscription: StoredSubscription, message: ReminderMessage): Promise<SendResult> {
      try {
        const body = await encryptPayload(utf8(JSON.stringify(message)), subscription.keys);
        const res = await fetchFn(subscription.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            TTL: String(6 * 3600),
            Urgency: 'normal',
            Authorization: await vapidAuthorization(subscription.endpoint, subject, keys, new Date()),
          },
          body,
        });
        if (res.ok) return 'sent';
        if (res.status === 404 || res.status === 410) return 'gone';
        console.warn(`push refused by ${new URL(subscription.endpoint).host}: ${res.status} ${(await res.text()).slice(0, 200)}`);
        return 'failed';
      } catch (error) {
        console.warn(`push error: ${(error as Error).message}`);
        return 'failed';
      }
    },
  };
}
