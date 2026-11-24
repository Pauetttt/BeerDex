import { asc } from 'drizzle-orm';
import { AppDatabase, schema } from '../db';

const DEFAULT_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

function shouldBypassCache(): boolean {
  return process.env.NODE_ENV === 'test';
}

async function cachedQuery<T>(key: string, loader: () => Promise<T>, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  if (shouldBypassCache()) {
    return loader();
  }

  const now = Date.now();
  const existing = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > now) {
    return existing.value;
  }

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) {
    return pending;
  }

  const promise = loader()
    .then((value) => {
      cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

export function invalidateCatalogCache(): void {
  cacheStore.clear();
  inFlight.clear();
}

export function getCachedIcons(db: AppDatabase) {
  return cachedQuery('icons', () =>
    db.select().from(schema.icons).orderBy(asc(schema.icons.id))
  );
}

export function getCachedTitles(db: AppDatabase) {
  return cachedQuery('titles', () =>
    db.select().from(schema.titles).orderBy(asc(schema.titles.id))
  );
}

export function getCachedCosmetics(db: AppDatabase) {
  return cachedQuery('cosmetics', () =>
    db.select().from(schema.cosmetics).orderBy(asc(schema.cosmetics.id))
  );
}

export function getCachedAchievements(db: AppDatabase) {
  return cachedQuery('achievements', () =>
    db.select().from(schema.achievements).orderBy(asc(schema.achievements.id))
  );
}

export function getCachedBrands(db: AppDatabase) {
  return cachedQuery('brands', () =>
    db.select().from(schema.brands).orderBy(asc(schema.brands.id))
  );
}

export function getCachedBeers(db: AppDatabase) {
  return cachedQuery('beers', () =>
    db.select().from(schema.beers).orderBy(asc(schema.beers.id))
  );
}
