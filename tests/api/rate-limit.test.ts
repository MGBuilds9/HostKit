import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 5 });
    for (let i = 0; i < 5; i++) {
      const result = limiter.check("user-1");
      expect(result.success).toBe(true);
    }
  });

  it("rejects requests over the limit", () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 3 });
    limiter.check("user-1");
    limiter.check("user-1");
    limiter.check("user-1");
    const result = limiter.check("user-1");
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("returns correct remaining count", () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 5 });
    const r1 = limiter.check("user-1");
    expect(r1.remaining).toBe(4);
    const r2 = limiter.check("user-1");
    expect(r2.remaining).toBe(3);
    const r3 = limiter.check("user-1");
    expect(r3.remaining).toBe(2);
  });

  it("window resets after expiry", () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 2 });
    limiter.check("user-1");
    limiter.check("user-1");
    expect(limiter.check("user-1").success).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(61_000);

    const result = limiter.check("user-1");
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("different identifiers are tracked independently", () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 2 });
    limiter.check("user-a");
    limiter.check("user-a");
    expect(limiter.check("user-a").success).toBe(false);

    // user-b is unaffected
    expect(limiter.check("user-b").success).toBe(true);
  });

  it("returns a resetAt date in the future", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 5 });
    const result = limiter.check("user-1");
    expect(result.resetAt).toBeInstanceOf(Date);
    expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("returns remaining=0 and correct resetAt when blocked", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 1 });
    limiter.check("user-1"); // allowed
    const blocked = limiter.check("user-1"); // blocked
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("handles maxRequests of 1", () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 1 });
    expect(limiter.check("solo").success).toBe(true);
    expect(limiter.check("solo").success).toBe(false);
  });

  it("cleans up stale entries when store grows large", () => {
    const limiter = rateLimit({ windowMs: 1_000, maxRequests: 100 });

    // Fill 500 unique identifiers
    for (let i = 0; i < 500; i++) {
      limiter.check(`user-${i}`);
    }

    // Advance past window so all entries are stale
    vi.advanceTimersByTime(2_000);

    // 501st entry triggers cleanup — should still succeed
    const result = limiter.check("trigger-cleanup");
    expect(result.success).toBe(true);
  });
});
