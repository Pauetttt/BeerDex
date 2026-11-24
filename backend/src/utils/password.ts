import { sql } from 'drizzle-orm';
import { AppDatabase, getDbDriver } from '../db';

const PBKDF2_PREFIX = 'pbkdf2_sha256';
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function derivePbkdf2Bits(
  password: string,
  salt: Uint8Array,
  iterations: number,
  lengthBytes: number
): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto SubtleCrypto no está disponible en este entorno.');
  }

  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const saltCopy = new Uint8Array(salt.byteLength);
  saltCopy.set(salt);

  const bits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltCopy,
      iterations,
    },
    keyMaterial,
    lengthBytes * 8
  );

  return new Uint8Array(bits);
}

/** Genera un hash PBKDF2-SHA256 nativo en Web Crypto (<2 ms en Cloudflare Workers). */
export async function hashPassword(password: string): Promise<string> {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues || !cryptoApi?.subtle) {
    throw new Error('Web Crypto no está disponible para generar el hash.');
  }

  const salt = new Uint8Array(SALT_BYTES);
  cryptoApi.getRandomValues(salt);
  const derived = await derivePbkdf2Bits(password, salt, PBKDF2_ITERATIONS, HASH_BYTES);

  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
}

function extractPgcryptoOk(result: unknown): boolean {
  if (Array.isArray(result)) {
    const first = result[0] as { ok?: unknown } | undefined;
    return Boolean(first?.ok);
  }
  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows?: Array<{ ok?: unknown }> }).rows;
    return Boolean(rows?.[0]?.ok);
  }
  return false;
}

/**
 * Verifica una contraseña contra PBKDF2-SHA256 o hashes bcrypt legados ($2a$/$2b$/$2y$).
 * En Neon/PostgreSQL verifica bcrypt con pgcrypto (0 ms CPU en Worker) y marca needsRehash=true.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  db?: AppDatabase
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!storedHash) {
    return { valid: false, needsRehash: false };
  }

  if (storedHash.startsWith(`${PBKDF2_PREFIX}$`)) {
    const parts = storedHash.split('$');
    if (parts.length !== 4) {
      return { valid: false, needsRehash: false };
    }
    const iterations = Number(parts[1]);
    if (!Number.isInteger(iterations) || iterations < 10_000 || iterations > 600_000) {
      return { valid: false, needsRehash: false };
    }
    try {
      const salt = fromBase64(parts[2]);
      const expected = fromBase64(parts[3]);
      if (salt.length < 8 || expected.length < 16) {
        return { valid: false, needsRehash: false };
      }
      const derived = await derivePbkdf2Bits(password, salt, iterations, expected.length);
      return {
        valid: timingSafeEqualBytes(derived, expected),
        needsRehash: false,
      };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  if (
    storedHash.startsWith('$2a$') ||
    storedHash.startsWith('$2b$') ||
    storedHash.startsWith('$2y$')
  ) {
    if (db && getDbDriver() !== 'pglite') {
      try {
        const res = await db.execute(
          sql`SELECT (crypt(${password}, ${storedHash}) = ${storedHash}) AS ok`
        );
        const ok = extractPgcryptoOk(res);
        return { valid: ok, needsRehash: ok };
      } catch {
        // Fallback a bcryptjs si la extensión pgcrypto no está disponible
      }
    }

    const bcryptModule = await import('bcryptjs');
    const bcrypt = bcryptModule.default ?? bcryptModule;
    const ok = await bcrypt.compare(password, storedHash);
    return { valid: ok, needsRehash: ok };
  }

  return { valid: false, needsRehash: false };
}
