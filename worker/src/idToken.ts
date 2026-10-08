// Checks a Firebase sign-in token (sent by the app with "Send a test
// notification"), so a test only ever goes to the person asking.
import { base64UrlDecode, utf8 } from './bytes';

const KEYS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

type Jwk = JsonWebKey & { kid: string };
let cachedKeys: { keys: Jwk[]; until: number } | null = null;

async function signingKeys(fetchFn: typeof fetch): Promise<Jwk[]> {
  if (cachedKeys && cachedKeys.until > Date.now()) return cachedKeys.keys;
  const res = await fetchFn(KEYS_URL);
  if (!res.ok) throw new Error(`Could not fetch Google's signing keys: ${res.status}`);
  cachedKeys = { keys: ((await res.json()) as { keys: Jwk[] }).keys, until: Date.now() + 3600_000 };
  return cachedKeys.keys;
}

/** Forget cached keys (tests). */
export function resetSigningKeys() { cachedKeys = null; }

/** The signed-in person's uid, or an error explaining why the token was refused. */
export async function verifyIdToken(token: string, projectId: string, now: Date, fetchFn: typeof fetch = fetch): Promise<string> {
  const [h, c, s] = token.split('.');
  if (!h || !c || !s) throw new Error('malformed token');
  const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(h))) as { alg?: string; kid?: string };
  if (header.alg !== 'RS256') throw new Error('unexpected token algorithm');
  const jwk = (await signingKeys(fetchFn)).find(k => k.kid === header.kid);
  if (!jwk) throw new Error('unknown signing key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64UrlDecode(s), utf8(`${h}.${c}`)))) throw new Error('bad signature');

  const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(c))) as { aud?: string; iss?: string; exp?: number; iat?: number; sub?: string };
  const t = now.getTime() / 1000;
  if (claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('token is for another project');
  if (!claims.exp || claims.exp < t) throw new Error('token expired');
  if (claims.iat && claims.iat > t + 300) throw new Error('token from the future');
  if (!claims.sub) throw new Error('token has no user');
  return claims.sub;
}
