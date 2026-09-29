import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth at module boundary (existing convention).
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

// Chainable select mock for the accounts lookup.
const mockSelectLimit = vi.fn();
const mockSelectWhere = vi.fn(() => ({ limit: mockSelectLimit }));
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn((..._a: unknown[]): { from: typeof mockSelectFrom } => ({ from: mockSelectFrom }));
const mockUpdateWhere = vi.fn((..._a: unknown[]) => Promise.resolve(undefined));
const mockUpdateSet = vi.fn((..._a: unknown[]) => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn((..._a: unknown[]) => ({ set: mockUpdateSet }));
vi.mock("@/db", () => ({
  db: {
    select: (...a: unknown[]) => mockSelect(...a),
    update: (...a: unknown[]) => mockUpdate(...a),
  },
}));

// Mock the shared Google token-refresh helper (owned by the sync agent).
const mockRefresh = vi.fn();
vi.mock("@/lib/google-token", () => ({
  refreshGoogleAccessToken: (...a: unknown[]) => mockRefresh(...a),
  GoogleCredentialsRevokedError: class GoogleCredentialsRevokedError extends Error {
    constructor(message = "google_credentials_revoked") {
      super(message);
      this.name = "GoogleCredentialsRevokedError";
    }
  },
  GoogleRefreshTransientError: class GoogleRefreshTransientError extends Error {
    constructor(message = "google_refresh_transient") {
      super(message);
      this.name = "GoogleRefreshTransientError";
    }
  },
}));

// Stub global fetch — drives the calendarList.list call.
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

import { GET } from "@/app/api/me/calendars/route";
import {
  GoogleCredentialsRevokedError,
  GoogleRefreshTransientError,
} from "@/lib/google-token";

function req(): NextRequest {
  return new NextRequest("http://localhost/api/me/calendars", { method: "GET" });
}

const FUTURE_EXPIRY = Math.floor(Date.now() / 1000) + 3600;
const PAST_EXPIRY = Math.floor(Date.now() / 1000) - 3600;

function accountRow(overrides: Partial<{
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
}> = {}) {
  return {
    provider: "google",
    providerAccountId: "g-1",
    access_token: "tok-fresh",
    refresh_token: "refresh-1",
    expires_at: FUTURE_EXPIRY,
    ...overrides,
  };
}

describe("GET /api/me/calendars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectLimit.mockResolvedValue([accountRow()]);
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            { id: "cal-a", summary: "Personal", primary: true },
            { id: "cal-b", summary: "Property — Kith 1423", primary: false },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
  });

  it("401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("409 no_google_account when no google row exists", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    mockSelectLimit.mockResolvedValue([]); // no account row
    const res = await GET();
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "no_google_account",
      reconnectUrl: "/login?prompt=consent",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("502 google_auth_failed when Google rejects the token (401)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    mockFetch.mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const res = await GET();
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("google_auth_failed");
    expect(body.reconnectUrl).toBe("/login?prompt=consent");
  });

  it("503 without a reconnect prompt when Calendar list is rate limited", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    mockFetch.mockResolvedValue(new Response("slow down", { status: 429 }));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("google_temporarily_unavailable");
    expect(body.reconnectUrl).toBeUndefined();
  });

  it("503 without a reconnect prompt when the Calendar list times out", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    mockFetch.mockRejectedValue(Object.assign(new Error("timed out"), { name: "TimeoutError" }));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("google_temporarily_unavailable");
    expect(body.reconnectUrl).toBeUndefined();
  });

  it("200 happy path returns parsed calendars (with primary flag)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      calendars: [
        { id: "cal-a", summary: "Personal", primary: true },
        { id: "cal-b", summary: "Property — Kith 1423", primary: false },
      ],
    });
    // Verify we asked Google for writer-min calendars.
    const fetchUrl = mockFetch.mock.calls[0][0] as string;
    expect(fetchUrl).toContain("minAccessRole=writer");
    expect(mockFetch.mock.calls[0][1]?.headers?.Authorization).toBe("Bearer tok-fresh");
  });

  it("refreshes via the shared helper when the access token is expired", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    mockSelectLimit.mockResolvedValue([accountRow({
      access_token: "tok-stale",
      refresh_token: "refresh-1",
      expires_at: PAST_EXPIRY,
    })]);
    mockRefresh.mockResolvedValue({ access_token: "tok-refreshed", expires_in: 3600 });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][1]?.headers?.Authorization).toBe("Bearer tok-refreshed");
    const persisted = mockUpdateSet.mock.calls[0][0] as { access_token?: string; expires_at?: number };
    expect(persisted.access_token).toBe("tok-refreshed");
    expect(persisted.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("still lists calendars when persisting the refreshed token fails", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    mockSelectLimit.mockResolvedValue([accountRow({
      access_token: "tok-stale",
      refresh_token: "refresh-1",
      expires_at: PAST_EXPIRY,
    })]);
    mockRefresh.mockResolvedValue({ access_token: "tok-refreshed", expires_in: 3600 });
    mockUpdateWhere.mockRejectedValueOnce(new Error("db down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET();
    err.mockRestore();
    expect(res.status).toBe(200);
    expect(mockFetch.mock.calls[0][1]?.headers?.Authorization).toBe("Bearer tok-refreshed");
  });

  it("502 google_auth_failed and does not call Calendar when the refresh grant is revoked", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    mockSelectLimit.mockResolvedValue([accountRow({
      access_token: "tok-stale",
      refresh_token: "refresh-1",
      expires_at: PAST_EXPIRY,
    })]);
    mockRefresh.mockRejectedValue(new GoogleCredentialsRevokedError());
    const res = await GET();
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("google_auth_failed");
    expect(body.reconnectUrl).toBe("/login?prompt=consent");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("503 without a reconnect prompt when refresh fails transiently", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    mockSelectLimit.mockResolvedValue([accountRow({
      access_token: "tok-stale",
      refresh_token: "refresh-1",
      expires_at: PAST_EXPIRY,
    })]);
    mockRefresh.mockRejectedValue(new GoogleRefreshTransientError("google refresh http 429"));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("google_temporarily_unavailable");
    expect(body.reconnectUrl).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("stops when Google repeats a calendar list page token", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    const page = (token: string) =>
      new Response(
        JSON.stringify({
          items: [{ id: "cal-a", summary: "Personal", primary: true }],
          nextPageToken: token,
        }),
        { status: 200 }
      );
    mockFetch.mockResolvedValueOnce(page("same")).mockResolvedValueOnce(page("same"));
    const res = await GET();
    expect(res.status).toBe(502);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const body = await res.json();
    expect(body.error).toBe("google_list_failed");
    expect(body.reconnectUrl).toBeUndefined();
    expect(body.message).toMatch(/repeated a page token/);
  });

  it("drops malformed calendar entries and keeps valid ones (zod-safe parsing)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            { id: "cal-ok", summary: "Works", primary: false },
            { id: null, summary: "Missing id", primary: false }, // dropped
            { id: "", summary: "Empty id", primary: false },      // dropped
          ],
        }),
        { status: 200 }
      )
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.calendars).toHaveLength(1);
    expect(body.calendars[0].id).toBe("cal-ok");
  });
});
