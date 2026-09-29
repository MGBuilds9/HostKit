import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockSyncAll = vi.fn((_opts?: { dryRun?: boolean }): Promise<{ results: unknown[]; totalSynced: number }> =>
  Promise.resolve({ results: [], totalSynced: 0 })
);
vi.mock("@/lib/ical-sync", () => ({
  syncAllCalendars: (...a: unknown[]) => mockSyncAll(...(a as [{ dryRun?: boolean }])),
}));

import { POST } from "@/app/api/cron/sync-calendars/dry-run/route";

function req(auth?: string) {
  return new NextRequest("http://localhost/api/cron/sync-calendars/dry-run", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
  });
}

const SECRET = "cron-secret-test";

describe("POST /api/cron/sync-calendars/dry-run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });

  it("401 without bearer", async () => {
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(mockSyncAll).not.toHaveBeenCalled();
  });

  it("401 with wrong bearer", async () => {
    const res = await POST(req("Bearer nope"));
    expect(res.status).toBe(401);
    expect(mockSyncAll).not.toHaveBeenCalled();
  });

  it("always invokes the sync with dryRun:true (never writes)", async () => {
    mockSyncAll.mockResolvedValue({
      results: [{ propertyId: "p1", synced: 5, created: 2, updated: 0, cancelled: 0, errors: [], dryRun: true }],
      totalSynced: 5,
    });
    const res = await POST(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(mockSyncAll).toHaveBeenCalledWith({ dryRun: true });
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(body.totalSynced).toBe(5);
    expect(body.results[0].created).toBe(2);
  });

  it("500 when CRON_SECRET missing", async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(req(`Bearer anything`));
    expect(res.status).toBe(500);
    expect(mockSyncAll).not.toHaveBeenCalled();
  });
});
