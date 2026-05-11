const COOKIE_NAME = 'petloo-session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET não está configurada.');
  return s;
}

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacHex(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return bytesToHex(sig);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSessionToken(email: string): Promise<string> {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${email}|${exp}`;
  const sig = await hmacHex(payload);
  return `${btoa(payload).replace(/=+$/, '')}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<{ email: string } | null> {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const b64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let payload: string;
  try {
    payload = atob(b64);
  } catch {
    return null;
  }
  const expected = await hmacHex(payload);
  if (!constantTimeEqual(sig, expected)) return null;
  const sep = payload.indexOf('|');
  if (sep < 0) return null;
  const email = payload.slice(0, sep);
  const exp = Number(payload.slice(sep + 1));
  if (!email || !exp || Date.now() > exp) return null;
  return { email };
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = MAX_AGE_SECONDS;
