import Redis from "ioredis";

// Caching is entirely optional: with no REDIS_URL configured (e.g. local dev), every
// helper below is a no-op that falls through to the real data source, so the app behaves
// exactly as it did before Redis existed. Same if Redis is unreachable at runtime - a
// cache failure should never turn into a request failure.
let client: Redis | null | undefined;

function getClient(): Redis | null {
  if (client !== undefined) return client;

  if (!process.env.REDIS_URL) {
    client = null;
    return client;
  }

  client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    lazyConnect: false,
  });
  client.on("error", (err) => console.error("Redis error:", err.message));

  return client;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Swallow write failures - a cold cache just means the next read hits the DB.
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  const redis = getClient();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // Worst case a stale value lingers until its TTL expires.
  }
}

/// Reads through the cache; on a miss, calls `fn`, caches the result for `ttlSeconds`, and
/// returns it. `fn` runs whenever the cache is unavailable, so it's always the source of truth.
export async function getOrSetCache<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const fresh = await fn();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}
