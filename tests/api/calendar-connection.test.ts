import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth at module boundary (existing convention).
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

// The route performs a sequence of separate select(...) chains:
//   1) properties lookup (ownerId)
//   2) owners lookup (only when role is owner/cleaner) for the
//      property-owner gate
//   3) accounts lookup (only on POST) for the refresh_token check
// We keep THREE independent mocks so tests can control each stage without
// coupling to call order.
const mockPropertyLimit = vi.fn();
const mockOwnerLimit = vi.fn();
const mockAccountLimit = vi.fn();

const mockPropertySelectFrom = vi.fn(() => ({
  where: () => ({ limit: mockPropertyLimit }),
}));
const mockOwnerSelectFrom = vi.fn(() => ({
  where: () => ({ limit: mockOwnerLimit }),
}));
const mockAccountSelectFrom = vi.fn(() => ({
  where: () => ({ limit: mockAccountLimit }),
}));

// Dispatch select by the table argument: properties -> owners -> accounts.
// Drizzle passes the table object as the second-arg to `.from(...)`; since
// our mock captures via `.select()` then `.from()`, we expose three named
// "selectors" via an internal routing flag encoded in the select call.
// Simpler: have `.select()` peek at whether we're being handed the property
// projections (which the route distinguishes by field name).
const mockSelect = vi.fn((...args: unknown[]): { from: unknown } => {
  const cols = args[0] as Record<string, unknown> | undefined;
  const keys = cols ? Object.keys(cols) : [];
  // properties lookup selects { ownerId }
  if (keys.includes("ownerId")) return { from: mockPropertySelectFrom };
  // owners lookup selects { userId }
  if (keys.includes("userId")) return { from: mockOwnerSelectFrom };
  // accounts lookup selects tokens
  return { from: mockAccountSelectFrom };
});

const mockUpdateReturning = vi.fn();
const mockUpdateWhere = vi.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn((_table?: unknown): { set: typeof mockUpdateSet } => ({ set: mockUpdateSet }));

vi.mock("@/db", () => ({
  db: {
    select: (...a: unknown[]) => mockSelect(...a),
    update: (...a: unknown[]) => mockUpdate(...a),
  },
}));

import {
  POST,
  DELETE,
} from "@/app/api/properties/[id]/calendar-connection/route";

const PARAMS = { params: { id: "prop-1" } };

function req(method: "POST" | "DELETE"): NextRequest {
  return new NextRequest(
    "http://localhost/api/properties/prop-1/calendar-connection",
    { method }
  );
}

const asRole = (role?: string, userId = "u1") =>
  role ? { user: { id: userId, role } } : null;

const FUTURE_EXPIRY = Math.floor(Date.now() / 1000) + 3600;

function freshUsableAccount() {
  return {
    access_token: "tok",
    refresh_token: "refresh-1",
    expires_at: FUTURE_EXPIRY,
  };
}

describe("POST /api/properties/[id]/calendar-connection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPropertyLimit.mockResolvedValue([{ ownerId: "owner-1" }]);
    mockOwnerLimit.mockResolvedValue([{ userId: "owner-user-1" }]);
    mockAccountLimit.mockResolvedValue([freshUsableAccount()]);
    mockUpdateReturning.mockResolvedValue([
      { id: "prop-1", calendarConnectedByUserId: "u1" },
    ]);
  });

  it("401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(req("POST"), PARAMS);
    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("404 when the property doesn't exist", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockPropertyLimit.mockResolvedValue([]);
    const res = await POST(req("POST"), PARAMS);
    expect(res.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("200 for admin and sets calendarConnectedByUserId to the caller", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    const res = await POST(req("POST"), PARAMS);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "prop-1", calendarConnectedByUserId: "u1" });
    // The update must have set the pointer to the caller's id.
    const setArg = (mockUpdateSet.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(setArg.calendarConnectedByUserId).toBe("u1");
    expect(setArg.icalSyncEnabled).toBeUndefined();
  });

  it("200 for manager role", async () => {
    mockAuth.mockResolvedValue(asRole("manager"));
    const res = await POST(req("POST"), PARAMS);
    expect(res.status).toBe(200);
  });

  it("200 for the property's owner (owner.userId === session.user.id)", async () => {
    mockAuth.mockResolvedValue(asRole("owner", "owner-user-1"));
    const res = await POST(req("POST"), PARAMS);
    expect(res.status).toBe(200);
  });

  it("403 for an owner who is NOT the property owner", async () => {
    mockAuth.mockResolvedValue(asRole("owner", "someone-else"));
    const res = await POST(req("POST"), PARAMS);
    expect(res.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("403 for cleaner role", async () => {
    mockAuth.mockResolvedValue(asRole("cleaner"));
    const res = await POST(req("POST"), PARAMS);
    expect(res.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("409 reconnect_required when the refresh_token is null", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockAccountLimit.mockResolvedValue([{
      access_token: null,
      refresh_token: null,
      expires_at: null,
    }]);
    const res = await POST(req("POST"), PARAMS);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("reconnect_required");
    expect(body.reconnectUrl).toContain("prompt=consent");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("409 reconnect_required when access is expired AND no refresh_token exists", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockAccountLimit.mockResolvedValue([{
      access_token: "tok",
      refresh_token: null,
      expires_at: Math.floor(Date.now() / 1000) - 100, // in the past
    }]);
    const res = await POST(req("POST"), PARAMS);
    expect(res.status).toBe(409);
  });

  it("409 reconnect_required when the access token is unexpired but there is no refresh token", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockAccountLimit.mockResolvedValue([{
      access_token: "tok",
      refresh_token: null,
      expires_at: FUTURE_EXPIRY,
    }]);
    const res = await POST(req("POST"), PARAMS);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "reconnect_required",
      reconnectUrl: "/login?prompt=consent",
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("409 when the refresh token is only whitespace", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockAccountLimit.mockResolvedValue([{ refresh_token: "   " }]);
    const res = await POST(req("POST"), PARAMS);
    expect(res.status).toBe(409);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("200 when a refresh token exists even if the access token is expired", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockAccountLimit.mockResolvedValue([{
      refresh_token: "refresh-1",
    }]);
    const res = await POST(req("POST"), PARAMS);
    expect(res.status).toBe(200);
    const setArg = (mockUpdateSet.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(setArg.icalSyncEnabled).toBeUndefined();
    expect(setArg.googleCalendarId).toBeUndefined();
  });

  it("stores the chosen calendar and turns sync on when the body names one", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    const res = await POST(
      new NextRequest("http://localhost/api/properties/prop-1/calendar-connection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ googleCalendarId: " cal-1 " }),
      }),
      PARAMS
    );
    expect(res.status).toBe(200);
    const setArg = (mockUpdateSet.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(setArg.googleCalendarId).toBe("cal-1");
    expect(setArg.icalSyncEnabled).toBe(true);
  });

  it("400 on invalid JSON and does not connect", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    const res = await POST(
      new NextRequest("http://localhost/api/properties/prop-1/calendar-connection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
      PARAMS
    );
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/properties/[id]/calendar-connection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPropertyLimit.mockResolvedValue([{ ownerId: "owner-1" }]);
    mockOwnerLimit.mockResolvedValue([{ userId: "owner-user-1" }]);
    mockUpdateReturning.mockResolvedValue([
      { id: "prop-1", calendarConnectedByUserId: null },
    ]);
  });

  it("401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(req("DELETE"), PARAMS);
    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("200 for admin and clears the pointer to null", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    const res = await DELETE(req("DELETE"), PARAMS);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "prop-1", calendarConnectedByUserId: null });
    const setArg = (mockUpdateSet.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(setArg.calendarConnectedByUserId).toBeNull();
  });

  it("200 for the property's owner", async () => {
    mockAuth.mockResolvedValue(asRole("owner", "owner-user-1"));
    const res = await DELETE(req("DELETE"), PARAMS);
    expect(res.status).toBe(200);
  });

  it("403 for a different owner", async () => {
    mockAuth.mockResolvedValue(asRole("owner", "someone-else"));
    const res = await DELETE(req("DELETE"), PARAMS);
    expect(res.status).toBe(403);
  });

  it("403 for cleaner", async () => {
    mockAuth.mockResolvedValue(asRole("cleaner"));
    const res = await DELETE(req("DELETE"), PARAMS);
    expect(res.status).toBe(403);
  });
});
