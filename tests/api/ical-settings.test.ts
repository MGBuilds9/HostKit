import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth + db at module boundaries.
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

const mockUpdateReturning = vi.fn();
const mockUpdateWhere = vi.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));
vi.mock("@/db", () => ({ db: { update: (...a: unknown[]) => mockUpdate(...a) } }));

import { PUT } from "@/app/api/properties/[id]/ical-settings/route";

const PARAMS = { params: { id: "prop-1" } };
function req(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/properties/prop-1/ical-settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const asRole = (role?: string) =>
  role ? { user: { id: "u1", role } } : null;

describe("PUT /api/properties/[id]/ical-settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateReturning.mockResolvedValue([{ id: "prop-1", icalSyncEnabled: true }]);
  });

  it("401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUT(req({ icalSyncEnabled: true }), PARAMS);
    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("403 for a non-admin/manager role (owner, cleaner)", async () => {
    for (const role of ["owner", "cleaner"]) {
      mockAuth.mockResolvedValue(asRole(role));
      const res = await PUT(req({ icalSyncEnabled: true }), PARAMS);
      expect(res.status).toBe(403);
    }
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("400 on invalid payload (bad enum / out-of-range number)", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    const res = await PUT(req({ cleanOn: "invalid-value" }), PARAMS);
    expect(res.status).toBe(400);
    const res2 = await PUT(req({ syncIntervalMinutes: 99999 }), PARAMS);
    expect(res2.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("200 for admin and maps empty-string urls/ids to null", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    const res = await PUT(
      req({ airbnbIcalUrl: "", googleCalendarId: "", icalSyncEnabled: false, syncIntervalMinutes: 30 }),
      PARAMS
    );
    expect(res.status).toBe(200);
    const setArg = mockUpdateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.airbnbIcalUrl).toBeNull();
    expect(setArg.googleCalendarId).toBeNull();
    expect(setArg.icalSyncEnabled).toBe(false);
    expect(setArg.syncIntervalMinutes).toBe(30);
  });

  it("200 for manager role as well", async () => {
    mockAuth.mockResolvedValue(asRole("manager"));
    const res = await PUT(req({ timezone: "America/Toronto", cleanOn: "checkin" }), PARAMS);
    expect(res.status).toBe(200);
    const setArg = mockUpdateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.timezone).toBe("America/Toronto");
    expect(setArg.cleanOn).toBe("checkin");
  });

  it("404 when the property does not exist (no row returned)", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockUpdateReturning.mockResolvedValue([]);
    const res = await PUT(req({ icalSyncEnabled: true }), PARAMS);
    expect(res.status).toBe(404);
  });
});
