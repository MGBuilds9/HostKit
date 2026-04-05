import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB so no real DB is needed
vi.mock("@/db", () => ({
  db: {
    query: {
      owners: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: "stay-1" }]),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  },
}));

vi.mock("@/lib/turnover-generator", () => ({
  generateCleaningTasks: vi.fn().mockResolvedValue(undefined),
  cancelCleaningTasksForStay: vi.fn().mockResolvedValue(undefined),
}));

import { fetchAndParseIcal, computeStayHash, type ParsedStay } from "@/lib/ical-sync";

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
