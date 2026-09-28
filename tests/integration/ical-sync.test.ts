import { describe, it, expect, vi, beforeEach } from "vitest";

// Shared chainable mocks we can re-point per test.

const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

// Per-test programmable select results keyed by call shape. A select call is
// tagged by its projection / read shape so each logical read returns its own fixture:
//  - select({ id })                                -> "enabledProps"   (syncAllCalendars)
//  - select({ ownerId })                           -> "propOwner"      (resolve token step 1)
//  - select({ userId })                            -> "ownerUser"      (resolve token step 2)
//  - select({ provider, ... })                     -> "googleAccount"  (resolve token step 3)
//  - select({ id, externalUid, status })           -> "stale"          (stale read, NO .limit())
//  - full-row select (no projection, .limit())     -> "full"           (load property / upsert lookup)
// Each tag value is a QUEUE of row-sets, consumed in call order for that tag.
let selectResults: Record<string, unknown[][]> = {};
function tagFor(projection: unknown): string {
  if (projection && typeof projection === "object") {
    const keys = Object.keys(projection as object);
    if (keys.includes("provider")) return "googleAccount";
    if (keys.includes("externalUid") && keys.includes("status")) return "stale";
    if (keys.includes("ownerId")) return "propOwner";
    if (keys.includes("userId")) return "ownerUser";
    if (keys.length === 1 && keys[0] === "id") return "enabledProps";
  }
  return "full";
}
function consume(tag: string): unknown[] {
  const q = selectResults[tag];
  if (!q || q.length === 0) return [];
  // Keep returning the last entry if a tag is read more times than seeded.
  return q.length > 1 ? q.shift()! : q[0];
}

const mockInsertValues = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: "stay-1" }]) }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockSelect = vi.fn((projection?: unknown) => {
  const tag = tagFor(projection);
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => {
        const rows = () => Promise.resolve(consume(tag));
        return {
          limit: vi.fn().mockImplementation(rows),
          // stale-cancellation read awaits the where() result directly (no .limit())
          then: (onF?: (v: unknown[]) => unknown) => rows().then(onF),
        };
      }),
    })),
  };
});

// Mock the DB so no real DB is needed
vi.mock("@/db", () => ({
  db: {
    query: {
      owners: { findFirst: vi.fn() },
    },
    insert: vi.fn((...a: unknown[]) => mockInsert(...a)),
    select: vi.fn((...a: unknown[]) => mockSelect(...a)),
    update: vi.fn((...a: unknown[]) => mockUpdate(...a)),
  },
}));

vi.mock("@/lib/turnover-generator", () => ({
  generateCleaningTasks: vi.fn().mockResolvedValue(undefined),
  cancelCleaningTasksForStay: vi.fn().mockResolvedValue(undefined),
}));

import {
  fetchAndParseIcal,
  computeStayHash,
  fetchGoogleCalendarEvents,
  syncPropertyCalendar,
  resolveGoogleAccessToken,
  type ParsedStay,
} from "@/lib/ical-sync";

// Minimal valid iCal string
const ICAL_FIXTURE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Airbnb Inc//Hosting//EN
BEGIN:VEVENT
DTSTART:20260601T140000Z
DTEND:20260605T110000Z
SUMMARY:John Smith
UID:reservation-abc-123@airbnb.com
END:VEVENT
BEGIN:VEVENT
DTSTART:20260610T140000Z
DTEND:20260615T110000Z
SUMMARY:Not available
UID:blocked-xyz-456@airbnb.com
END:VEVENT
BEGIN:VEVENT
DTSTART:20260620T140000Z
DTEND:20260625T110000Z
SUMMARY:Cancelled: Mike Jones
UID:cancelled-789@airbnb.com
END:VEVENT
END:VCALENDAR`;

describe("fetchAndParseIcal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses a valid iCal feed and returns stays", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(ICAL_FIXTURE),
    });

    const stays = await fetchAndParseIcal("https://www.airbnb.com/calendar/ical/test.ics");

    expect(stays).toHaveLength(3);
    expect(stays[0].externalUid).toBe("reservation-abc-123@airbnb.com");
    expect(stays[0].status).toBe("booked");
    expect(stays[0].guestName).toBe("John Smith");
  });

  it("marks blocked events correctly", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(ICAL_FIXTURE),
    });

    const stays = await fetchAndParseIcal("https://example.com/cal.ics");
    const blocked = stays.find((s) => s.externalUid === "blocked-xyz-456@airbnb.com");

    expect(blocked).toBeDefined();
    expect(blocked!.status).toBe("blocked");
    expect(blocked!.guestName).toBeNull();
  });

  it("marks cancelled events correctly", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(ICAL_FIXTURE),
    });

    const stays = await fetchAndParseIcal("https://example.com/cal.ics");
    const cancelled = stays.find((s) => s.externalUid === "cancelled-789@airbnb.com");

    expect(cancelled).toBeDefined();
    expect(cancelled!.status).toBe("cancelled");
  });

  it("throws on non-ok HTTP response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    });

    await expect(fetchAndParseIcal("https://example.com/cal.ics")).rejects.toThrow(
      "iCal fetch failed: 403 Forbidden"
    );
  });

  it("throws on network failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await expect(fetchAndParseIcal("https://example.com/cal.ics")).rejects.toThrow(
      "Network error"
    );
  });

  it("returns empty array for empty iCal feed", async () => {
    const EMPTY_ICAL = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Airbnb Inc//Hosting//EN
END:VCALENDAR`;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(EMPTY_ICAL),
    });

    const stays = await fetchAndParseIcal("https://example.com/cal.ics");
    expect(stays).toHaveLength(0);
  });

  it("skips events without UID", async () => {
    const ICAL_NO_UID = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20260601T140000Z
DTEND:20260605T110000Z
SUMMARY:No UID Guest
END:VEVENT
END:VCALENDAR`;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(ICAL_NO_UID),
    });

    const stays = await fetchAndParseIcal("https://example.com/cal.ics");
    expect(stays).toHaveLength(0);
  });
});

describe("computeStayHash", () => {
  it("produces the same hash for identical stays", () => {
    const stay: ParsedStay = {
      externalUid: "uid-123",
      startDate: new Date("2026-06-01T14:00:00Z"),
      endDate: new Date("2026-06-05T11:00:00Z"),
      summary: "John Smith",
      description: "",
      status: "booked",
      guestName: "John Smith",
      source: "airbnb",
    };

    expect(computeStayHash(stay)).toBe(computeStayHash(stay));
  });

  it("produces different hashes for different stays", () => {
    const base: ParsedStay = {
      externalUid: "uid-123",
      startDate: new Date("2026-06-01T14:00:00Z"),
      endDate: new Date("2026-06-05T11:00:00Z"),
      summary: "John Smith",
      description: "",
      status: "booked",
      guestName: "John Smith",
      source: "airbnb",
    };

    const modified: ParsedStay = {
      ...base,
      endDate: new Date("2026-06-06T11:00:00Z"), // changed
    };

    expect(computeStayHash(base)).not.toBe(computeStayHash(modified));
  });

  it("returns a 64-character hex string (SHA-256)", () => {
    const stay: ParsedStay = {
      externalUid: "uid-abc",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-07"),
      summary: "Test",
      description: "",
      status: "booked",
      guestName: null,
      source: "airbnb",
    };

    const hash = computeStayHash(stay);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ── Google Calendar fetch ───────────────────────────────────────────────────

describe("fetchGoogleCalendarEvents", () => {
  beforeEach(() => vi.clearAllMocks());

  const okJson = (body: unknown) => ({
    ok: true,
    json: () => Promise.resolve(body),
  });

  it("parses events and maps Google statuses", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      okJson({
        items: [
          { id: "e1", summary: "John Smith", start: { dateTime: "2026-06-01T14:00:00Z" }, end: { dateTime: "2026-06-05T11:00:00Z" } },
          { id: "e2", summary: "Blocked", start: { date: "2026-06-10" }, end: { date: "2026-06-12" } },
          { id: "e3", summary: "Old booking", status: "cancelled", start: { dateTime: "2026-06-20T14:00:00Z" }, end: { dateTime: "2026-06-22T11:00:00Z" } },
        ],
      })
    );
    const stays = await fetchGoogleCalendarEvents("cal@example.com", "token");
    expect(stays).toHaveLength(3);
    expect(stays.find((s) => s.externalUid === "e1")!.status).toBe("booked");
    expect(stays.find((s) => s.externalUid === "e2")!.status).toBe("blocked");
    expect(stays.find((s) => s.externalUid === "e3")!.status).toBe("cancelled");
    expect(stays[0].source).toBe("google");
    expect(stays[0].guestName).toBe("John Smith");
  });

  it("skips events with no id or unparseable dates", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      okJson({
        items: [
          { summary: "No id", start: { dateTime: "2026-06-01T14:00:00Z" }, end: { dateTime: "2026-06-05T11:00:00Z" } },
          { id: "good", summary: "Ok", start: { dateTime: "2026-06-01T14:00:00Z" }, end: { dateTime: "2026-06-05T11:00:00Z" } },
          { id: "baddate", summary: "Bad", start: { dateTime: "not-a-date" }, end: { dateTime: "2026-06-05T11:00:00Z" } },
        ],
      })
    );
    const stays = await fetchGoogleCalendarEvents("cal@example.com", "token");
    expect(stays.map((s) => s.externalUid)).toEqual(["good"]);
  });

  it("follows nextPageToken until exhausted", async () => {
    const pages = [
      { items: [{ id: "p1", summary: "A", start: { dateTime: "2026-06-01T14:00:00Z" }, end: { dateTime: "2026-06-02T11:00:00Z" } }], nextPageToken: "tok2" },
      { items: [{ id: "p2", summary: "B", start: { dateTime: "2026-06-03T14:00:00Z" }, end: { dateTime: "2026-06-04T11:00:00Z" } }] },
    ];
    let call = 0;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const body = pages[call++];
      return Promise.resolve(okJson(body));
    });
    const stays = await fetchGoogleCalendarEvents("cal@example.com", "token");
    expect(call).toBe(2);
    expect(stays.map((s) => s.externalUid)).toEqual(["p1", "p2"]);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls[1][0]).toContain("pageToken=tok2");
  });

  it("throws a descriptive error on API failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({ error: { message: "Invalid Credentials" } }),
    });
    await expect(fetchGoogleCalendarEvents("cal@example.com", "bad-token")).rejects.toThrow(
      "Google Calendar API error: 401 — Invalid Credentials"
    );
  });
});

// ── syncPropertyCalendar — Google path + token resolution ────────────────────

describe("syncPropertyCalendar (Google token path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults = {};
  });

  const futureExpiry = Math.floor(Date.now() / 1000) + 3600; // valid for an hour

  it("uses a valid (non-expired) Google token without refreshing", async () => {
    // full: [load property] then [upsert lookup]; others shape-tagged
    selectResults = {
      full: [
        [{ id: "prop-1", airbnbIcalUrl: null, googleCalendarId: "cal@example.com" }],
        [], // upsert lookup for the single event → not found
      ],
      propOwner: [[{ ownerId: "owner-1" }]],
      ownerUser: [[{ userId: "user-1" }]],
      googleAccount: [[{ provider: "google", providerAccountId: "g-1", access_token: "tok-valid", refresh_token: "rt", expires_at: futureExpiry }]],
      stale: [[]],
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        items: [{ id: "g1", summary: "Guest A", start: { dateTime: "2026-07-01T14:00:00Z" }, end: { dateTime: "2026-07-05T11:00:00Z" } }],
      }),
    });
    const result = await syncPropertyCalendar("prop-1");
    expect(result.errors).toHaveLength(0);
    expect(result.created).toBe(1);
    // token refresh endpoint must NOT have been called
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(calls.some((u) => u.includes("oauth2.googleapis.com/token"))).toBe(false);
  });

  it("refreshes an expired token then uses the new access token", async () => {
    const pastExpiry = Math.floor(Date.now() / 1000) - 100;
    selectResults = {
      full: [
        [{ id: "prop-1", airbnbIcalUrl: null, googleCalendarId: "cal@example.com" }],
        [], // upsert lookup
      ],
      propOwner: [[{ ownerId: "owner-1" }]],
      ownerUser: [[{ userId: "user-1" }]],
      googleAccount: [[{ provider: "google", providerAccountId: "g-1", access_token: "tok-old", refresh_token: "rt-1", expires_at: pastExpiry }]],
      stale: [[]],
    };
    let calendarAuth = "";
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (String(url).includes("oauth2.googleapis.com/token")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ access_token: "tok-new", expires_in: 3600 }) });
      }
      const headers = (init?.headers ?? {}) as Record<string, string>;
      calendarAuth = headers.Authorization ?? "";
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
    });
    const result = await syncPropertyCalendar("prop-1");
    expect(result.errors).toHaveLength(0);
    expect(calendarAuth).toBe("Bearer tok-new");
    // account row updated with new token
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("records an error when refresh is denied (invalid_grant)", async () => {
    const pastExpiry = Math.floor(Date.now() / 1000) - 100;
    selectResults = {
      full: [[{ id: "prop-1", airbnbIcalUrl: null, googleCalendarId: "cal@example.com" }]],
      propOwner: [[{ ownerId: "owner-1" }]],
      ownerUser: [[{ userId: "user-1" }]],
      googleAccount: [[{ provider: "google", providerAccountId: "g-1", access_token: "tok-old", refresh_token: "rt-expired", expires_at: pastExpiry }]],
    };
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("oauth2.googleapis.com/token")) {
        return Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({ error: "invalid_grant" }) });
      }
      // calendar called with old (now useless) token fails
      return Promise.resolve({ ok: false, status: 401, statusText: "Unauthorized", json: () => Promise.resolve({ error: { message: "Invalid Credentials" } }) });
    });
    const result = await syncPropertyCalendar("prop-1");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.join(" ")).toMatch(/Google Calendar fetch error/);
  });

  it("pushes an error when the property has no Google account at all", async () => {
    selectResults = {
      full: [[{ id: "prop-1", airbnbIcalUrl: null, googleCalendarId: "cal@example.com" }]],
      propOwner: [[{ ownerId: "owner-1" }]],
      ownerUser: [[{ userId: "user-1" }]],
      googleAccount: [[]], // no google account row
    };
    global.fetch = vi.fn();
    const result = await syncPropertyCalendar("prop-1");
    expect(result.errors.join(" ")).toMatch(/No Google OAuth access token/);
  });
});

describe("resolveGoogleAccessToken", () => {
  beforeEach(() => { vi.clearAllMocks(); selectResults = {}; });

  it("returns null when the property does not exist", async () => {
    selectResults = { propOwner: [[]] };
    await expect(resolveGoogleAccessToken("missing-prop")).resolves.toBeNull();
  });

  it("returns the stored access token when not expired", async () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    selectResults = {
      propOwner: [[{ ownerId: "owner-1" }]],
      ownerUser: [[{ userId: "user-1" }]],
      googleAccount: [[{ provider: "google", providerAccountId: "g-1", access_token: "tok-live", refresh_token: "rt", expires_at: future }]],
    };
    global.fetch = vi.fn();
    await expect(resolveGoogleAccessToken("prop-1")).resolves.toBe("tok-live");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ── syncPropertyCalendar — dryRun mode ────────────────────────────────────────

describe("syncPropertyCalendar (dryRun)", () => {
  beforeEach(() => { vi.clearAllMocks(); selectResults = {}; });

  const ICAL_ONE_BOOKING = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Airbnb Inc//Hosting//EN
BEGIN:VEVENT
DTSTART:20260701T140000Z
DTEND:20260705T110000Z
SUMMARY:Jane Doe
UID:resv-jane-1@airbnb.com
END:VEVENT
END:VCALENDAR`;

  it("counts would-be inserts without writing to the DB", async () => {
    selectResults = {
      full: [
        [{ id: "prop-1", airbnbIcalUrl: "https://example.com/cal.ics", googleCalendarId: null }],
        [], // upsert lookup → event not found (would be created)
      ],
      stale: [[]],
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(ICAL_ONE_BOOKING) });

    const result = await syncPropertyCalendar("prop-1", { dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.created).toBe(1);
    expect(result.errors).toHaveLength(0);
    // NO DB writes at all in dry-run
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("performs real writes when dryRun is false", async () => {
    selectResults = {
      full: [
        [{ id: "prop-1", airbnbIcalUrl: "https://example.com/cal.ics", googleCalendarId: null }],
        [], // upsert lookup → not found
      ],
      stale: [[]],
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(ICAL_ONE_BOOKING) });

    const result = await syncPropertyCalendar("prop-1", { dryRun: false });
    expect(result.created).toBe(1);
    // real run does write (stay insert + sync logs + property update)
    expect(mockInsert).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
  });
});
