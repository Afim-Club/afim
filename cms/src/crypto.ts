import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from 'node:crypto';

// Field encryption for LGPD personal data (member affinities, e-mails). AES-256-GCM with a key that lives in the
// environment (DATA_ENCRYPTION_KEY, 32 bytes in base64), never in the database, so a database dump or a person with
// admin access can't read these fields. `hash` gives a keyed, deterministic value for lookups and uniqueness.
// The stored format is "v1:<iv>:<tag>:<ciphertext>" (base64url). database/migrations/*encrypt-personal-data.js
// repeats this code because migrations are plain JS: keep both in sync.

const PREFIX = 'v1:';
// Development only: production refuses to start without a real key (see keys()).
const DEV_KEY = Buffer.alloc(32, 7).toString('base64');

let cached: { enc: Buffer; mac: Buffer } | undefined;
function keys() {
  if (cached) return cached;
  let raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') throw new Error('DATA_ENCRYPTION_KEY is required (openssl rand -base64 32)');
    console.warn('DATA_ENCRYPTION_KEY is not set: using the public development key');
    raw = DEV_KEY;
  }
  const master = Buffer.from(raw, 'base64');
  if (master.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes in base64 (openssl rand -base64 32)');
  const derive = (info: string) => Buffer.from(hkdfSync('sha256', master, Buffer.alloc(0), info, 32));
  cached = { enc: derive('afim-encrypt'), mac: derive('afim-hash') };
  return cached;
}

// Longest e-mail that still fits a 255-character column once encrypted.
export const MAX_EMAIL = 150;

export const isEncrypted = (v: unknown) => typeof v === 'string' && v.startsWith(PREFIX);

export function encrypt(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keys().enc, iv);
  const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return PREFIX + [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join(':');
}

// Values written before encryption are returned as they are.
export function decrypt(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (!isEncrypted(value)) return value;
  const [iv, tag, data] = value.slice(PREFIX.length).split(':').map((s) => Buffer.from(s, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', keys().enc, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export const hash = (text: string) => createHmac('sha256', keys().mac).update(text).digest('base64url');

// Fails at boot, not on the first request, when the key is missing or malformed.
export const checkKey = () => void keys();
