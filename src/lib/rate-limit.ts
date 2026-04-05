interface RateLimitEntry {
  requests: number[];
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: Date;
}

export function rateLimit(config: RateLimitConfig) {
  const store = new Map<string, RateLimitEntry>();

  function cleanup(now: number) {
    Array.from(store.entries()).forEach(([key, entry]) => {
      const valid = entry.requests.filter((ts) => now - ts < config.windowMs);
      if (valid.length === 0) {
        store.delete(key);
      } else {
        entry.requests = valid;
      }
    });
  }

  return {
    check(identifier: string): RateLimitResult {
      const now = Date.now();

      // Periodic cleanup — only when the store grows large
      if (store.size > 500) {
        cleanup(now);
      }

      let entry = store.get(identifier);
      if (!entry) {
        entry = { requests: [] };
        store.set(identifier, entry);
      }

      // Drop expired timestamps
      entry.requests = entry.requests.filter((ts) => now - ts < config.windowMs);

      const resetAt = new Date(
        entry.requests.length > 0
          ? entry.requests[0] + config.windowMs
          : now + config.windowMs
      );

      if (entry.requests.length >= config.maxRequests) {
        return {
          success: false,
          remaining: 0,
          resetAt,
        };
      }

      entry.requests.push(now);

      return {
        success: true,
        remaining: config.maxRequests - entry.requests.length,
        resetAt,
      };
    },
  };
}
