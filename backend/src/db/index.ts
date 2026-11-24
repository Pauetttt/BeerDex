import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type { Pool as PgPool } from 'pg';
import { env } from '../config/env';
import * as schema from './schema';

export type DbDriver = 'neon' | 'postgres' | 'pglite';
export type AppDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;

let dbInstance: AppDatabase | null = null;
let activeDriver: DbDriver | null = null;
let initPromise: Promise<AppDatabase> | null = null;
let pgPool: PgPool | null = null;
let pgliteClient: { exec: (sql: string) => Promise<unknown>; close?: () => Promise<void> } | null =
  null;

function resolveDriver(url: string): DbDriver {
  if (!url || url.startsWith('pglite://')) {
    return 'pglite';
  }
  if (env.dbDriverOverride === 'neon' || url.includes('neon.tech')) {
    return 'neon';
  }
  if (env.dbDriverOverride === 'postgres') {
    return 'postgres';
  }
  return 'postgres';
}

async function applyPgliteMigrations(client: {
  exec: (sql: string) => Promise<unknown>;
  query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }>;
}): Promise<void> {
  if (typeof __dirname !== 'string') {
    throw new Error('PGlite requiere entorno Node con __dirname disponible.');
  }
  const migrationsDir = path.resolve(__dirname, '../../drizzle');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`No se encontró la carpeta de migraciones en ${migrationsDir}`);
  }

  await client.exec(`
    CREATE TABLE IF NOT EXISTS "_beerdex_migrations" (
      "filename" TEXT PRIMARY KEY,
      "applied_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const appliedRes = await client.query<{ filename: string }>(
    `SELECT "filename" FROM "_beerdex_migrations"`
  );
  const applied = new Set(appliedRes.rows.map((r) => r.filename));

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await client.exec(sqlContent);
    await client.query(`INSERT INTO "_beerdex_migrations" ("filename") VALUES ($1)`, [file]);
  }
}

export async function initDb(overrideUrl?: string): Promise<AppDatabase> {
  if (dbInstance && !overrideUrl) {
    return dbInstance;
  }
  if (initPromise && !overrideUrl) {
    return initPromise;
  }

  const runInit = async (): Promise<AppDatabase> => {
    const url = (overrideUrl ?? env.databaseUrl).trim();
    const driver = resolveDriver(url);
    activeDriver = driver;

    if (driver === 'neon') {
      const sqlClient = neon(url);
      dbInstance = drizzleNeon(sqlClient, { schema }) as unknown as AppDatabase;
      return dbInstance;
    }

    if (driver === 'postgres') {
      const [{ Pool }, { drizzle: drizzlePg }] = await Promise.all([
        import('pg'),
        import('drizzle-orm/node-postgres'),
      ]);
      pgPool = new Pool({ connectionString: url });
      dbInstance = drizzlePg(pgPool, { schema }) as unknown as AppDatabase;
      return dbInstance;
    }

    // Fallback local en desarrollo / tests: PGlite (PostgreSQL embebido sin servidor externo)
    const [{ PGlite }, { drizzle: drizzlePglite }] = await Promise.all([
      import('@electric-sql/pglite'),
      import('drizzle-orm/pglite'),
    ]);

    let pgliteTarget: string | undefined;
    if (url === 'pglite://memory') {
      pgliteTarget = undefined;
    } else if (url.startsWith('pglite://') && url.length > 'pglite://'.length) {
      pgliteTarget = url.slice('pglite://'.length);
    } else if (typeof __dirname === 'string') {
      pgliteTarget = path.resolve(__dirname, '../../.pglite');
    }

    const client = new PGlite(pgliteTarget);
    await client.waitReady;
    await applyPgliteMigrations(client);
    pgliteClient = client;
    dbInstance = drizzlePglite(client, { schema }) as unknown as AppDatabase;
    return dbInstance;
  };

  if (overrideUrl) {
    return runInit();
  }

  initPromise = runInit().catch((err) => {
    initPromise = null;
    throw err;
  });
  return initPromise;
}

export function getDb(): AppDatabase {
  if (!dbInstance) {
    throw new Error('Base de datos no inicializada. Llama a initDb() primero.');
  }
  return dbInstance;
}

export function getDbDriver(): DbDriver | null {
  return activeDriver;
}

export async function closeDb(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  if (pgliteClient?.close) {
    await pgliteClient.close();
    pgliteClient = null;
  }
  dbInstance = null;
  initPromise = null;
  activeDriver = null;
}

export { schema };
