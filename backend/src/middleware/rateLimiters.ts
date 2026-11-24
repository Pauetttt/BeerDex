import rateLimit, { ClientRateLimitInfo, Options, Store } from 'express-rate-limit';
import { env } from '../config/env';

interface HitEntry {
  totalHits: number;
  resetAtMs: number;
}

/**
 * Store en memoria sin setInterval para compatibilidad total con Cloudflare Workers
 * (los temporizadores globales fuera de fetch están prohibidos en workerd).
 */
class WorkersSafeMemoryStore implements Store {
  localKeys = true;
  private windowMs = 15 * 60 * 1000;
  private hits = new Map<string, HitEntry>();

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private pruneExpired(now: number): void {
    for (const [key, entry] of this.hits.entries()) {
      if (entry.resetAtMs <= now) {
        this.hits.delete(key);
      }
    }
  }

  get(key: string): ClientRateLimitInfo | undefined {
    const entry = this.hits.get(key);
    if (!entry) return undefined;
    if (entry.resetAtMs <= Date.now()) {
      this.hits.delete(key);
      return undefined;
    }
    return {
      totalHits: entry.totalHits,
      resetTime: new Date(entry.resetAtMs),
    };
  }

  increment(key: string): ClientRateLimitInfo {
    const now = Date.now();
    if (this.hits.size > 5000) {
      this.pruneExpired(now);
    }

    const existing = this.hits.get(key);
    if (!existing || existing.resetAtMs <= now) {
      const resetAtMs = now + this.windowMs;
      const next: HitEntry = { totalHits: 1, resetAtMs };
      this.hits.set(key, next);
      return { totalHits: 1, resetTime: new Date(resetAtMs) };
    }

    existing.totalHits += 1;
    return {
      totalHits: existing.totalHits,
      resetTime: new Date(existing.resetAtMs),
    };
  }

  decrement(key: string): void {
    const entry = this.hits.get(key);
    if (entry && entry.totalHits > 0) {
      entry.totalHits -= 1;
    }
  }

  resetKey(key: string): void {
    this.hits.delete(key);
  }

  resetAll(): void {
    this.hits.clear();
  }
}

export function createAuthLimiter(maxRequests: number, windowMinutes = 15) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    store: new WorkersSafeMemoryStore(),
    keyGenerator: (req) => {
      const cfIp = req.headers['cf-connecting-ip'];
      if (typeof cfIp === 'string' && cfIp.trim()) {
        return cfIp.trim();
      }
      const xff = req.headers['x-forwarded-for'];
      if (typeof xff === 'string' && xff.trim()) {
        return xff.split(',')[0].trim();
      }
      return req.ip || req.socket?.remoteAddress || 'unknown';
    },
    validate: {
      xForwardedForHeader: false,
      ip: false,
      trustProxy: false,
    },
    message: {
      error: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.',
    },
    skip: (req) =>
      env.nodeEnv === 'test' && req.headers['x-enable-rate-limit-test'] !== 'true',
  });
}

export const authLoginLimiter = createAuthLimiter(15, 15);
export const authRecoveryLimiter = createAuthLimiter(5, 15);
