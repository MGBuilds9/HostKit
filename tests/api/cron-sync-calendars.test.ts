import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the sync engine + rate limiter at the module boundary.
const mockSyncAll = vi.fn();
vi.mock("@/lib/ical-sync", () => ({
  syncAllCalendars: (...a: unknown[]) => mockSyncAll(...a),
}));

const mockRateCheck = vi.fn(() => ({ success: true, remaining: 0, resetAt: new Date(Date.now() + 60000) }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({ check: (id: string) => mockRateCheck(id) }),
}));

import { POST } from "@/app/api/cron/sync-calendars/route";

function req(authHeader?: string): NextRequest {
  return new NextRequest("http://localhost/api/cron/sync-calendars", {
    method: "POST",
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

const CRON_SECRET = "test-cron-secret";

describe("POST /api/cron/sync-calendars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    mockRateCheck.mockReturnValue({ success: true, remaining: 0, resetAt: new Date(Date.now() + 60000) });
    mockSyncAll.mockResolvedValue({
      results: [{ propertyId: "p1", synced: 3, created: 1, updated: 1, cancelled: 1, errors: [] }],
      totalSynced: 3,
    });
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(mockSyncAll).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer token is wrong", async () => {
    const res = await POST(req("Bearer wrong-secret"));
    expect(res.status).toBe(401);
    expect(mockSyncAll).not.toHaveBeenCalled();
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(req("Bearer anything"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/CRON_SECRET not configured/);
    expect(mockSyncAll).not.toHaveBeenCalled();
  });

  it("runs the sync and returns per-property results on valid bearer", async () => {
    const res = await POST(req(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(200);
    expect(mockSyncAll).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.propertiesProcessed).toBe(1);
    expect(body.totalSynced).toBe(3);
    expect(body.errorCount).toBe(0);
  });

  it("surfaces per-property sync errors in errorCount", async () => {
    mockSyncAll.mockResolvedValue({
      results: [{ propertyId: "p1", synced: 0, created: 0, updated: 0, cancelled: 0, errors: ["boom"] }],
      totalSynced: 0,
    });
    const res = await POST(req(`Bearer ${CRON_SECRET}`));
    const body = await res.json();
    expect(body.errorCount).toBe(1);
  });

  it("returns 429 when the global rate limit is exceeded", async () => {
    mockRateCheck.mockReturnValue({ success: false, remaining: 0, resetAt: new Date(Date.now() + 30000) });
    const res = await POST(req(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(mockSyncAll).not.toHaveBeenCalled();
  });

  it("returns 500 when the sync engine throws unexpectedly", async () => {
    mockSyncAll.mockRejectedValue(new Error("db down"));
    const res = await POST(req(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("db down");
  });
});
