/**
 * In-Memory & Redis Cache, Write-Locks, and Exponential Backoff Retries (Section 6.3)
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class CacheManager {
  private inMemoryCache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.inMemoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.inMemoryCache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds = 30): void {
    this.inMemoryCache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  invalidate(prefixOrKey: string): void {
    for (const k of Array.from(this.inMemoryCache.keys())) {
      if (k.startsWith(prefixOrKey)) {
        this.inMemoryCache.delete(k);
      }
    }
  }

  clear(): void {
    this.inMemoryCache.clear();
  }
}

export const sheetCache = new CacheManager();

/**
 * Concurrency write-lock per spreadsheet
 */
class WriteMutex {
  private activeLocks = new Map<string, Promise<void>>();

  async acquire(key: string, timeoutMs = 10000): Promise<() => void> {
    const startTime = Date.now();
    while (this.activeLocks.has(key)) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Write lock timeout for spreadsheet ${key}`);
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    let releaseResolve: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      releaseResolve = resolve;
    });

    this.activeLocks.set(key, lockPromise);

    return () => {
      this.activeLocks.delete(key);
      releaseResolve();
    };
  }
}

export const writeMutex = new WriteMutex();

/**
 * Exponential backoff for HTTP 429 and 5xx errors (Section 6.3)
 * Retries up to 4 times: 1s, 2s, 4s, 8s
 */
export async function withRetries<T>(
  fn: () => Promise<T>,
  maxRetries = 4,
  initialDelayMs = 1000
): Promise<T> {
  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status || err?.code || err?.response?.status;
      const isRetryable =
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        err?.message?.includes("RESOURCE_EXHAUSTED") ||
        err?.message?.includes("rate limit");

      if (attempt < maxRetries && isRetryable) {
        attempt++;
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2; // exponential backoff
      } else {
        throw err;
      }
    }
  }

  throw new Error("Maximum retry attempts exceeded.");
}
