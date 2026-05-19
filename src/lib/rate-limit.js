import { LRUCache } from "lru-cache";

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX = 30;
const MAX_TRACKED_KEYS = 10000;

const buckets = new LRUCache({
  max: MAX_TRACKED_KEYS,
  ttl: DEFAULT_WINDOW_MS * 2,
});

export function checkRateLimit(key, options = {}) {
  const limit = options.limit ?? DEFAULT_MAX;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: windowMs - (now - entry.windowStart),
    };
  }

  entry.count += 1;
  buckets.set(key, entry);
  return { allowed: true, remaining: limit - entry.count, retryAfterMs: 0 };
}

export function resetRateLimit(key) {
  buckets.delete(key);
}

export function clearAllRateLimits() {
  buckets.clear();
}
