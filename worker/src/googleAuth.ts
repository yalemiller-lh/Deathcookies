// Google access tokens from a service-account key (OAuth 2.0 JWT bearer grant),
// with Web Crypto, so the worker can call the Firestore REST API.
import { base64UrlEncode, base64UrlJson, utf8 } from './bytes';

export interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

export const DATASTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** The signed request a service account sends to ask for a token. */
export async function signedAssertion(account: ServiceAccount, scope: string, now: Date): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  const unsigned = `${base64UrlJson({ alg: 'RS256', typ: 'JWT' })}.${base64UrlJson({ iss: account.client_email, scope, aud: TOKEN_URL, iat, exp: iat + 3600 })}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(account.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  return `${unsigned}.${base64UrlEncode(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, utf8(unsigned)))}`;
}

/** A function that fetches a token on first use and reuses it until near expiry. */
export function tokenSource(account: ServiceAccount, scope: string, fetchFn: typeof fetch = fetch): () => Promise<string> {
  let cached: { token: string; expires: number } | null = null;
  return async () => {
    if (cached && cached.expires > Date.now() + 60_000) return cached.token;
    const res = await fetchFn(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: await signedAssertion(account, scope, new Date()) }),
    });
    if (!res.ok) throw new Error(`Google refused the service-account key: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const body = (await res.json()) as { access_token: string; expires_in: number };
    cached = { token: body.access_token, expires: Date.now() + body.expires_in * 1000 };
    return cached.token;
  };
}
