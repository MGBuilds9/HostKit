import { describe, it, expect, vi, beforeEach } from "vitest";

// Shape-tagged select mock (same convention as tests/integration/ical-sync.test.ts).
// Each logical read is tagged by its projection shape so different reads can be
// separately fixture-seeded:
//  - full-row select (no projection, .limit()) -> "full"  (load property / upsert lookup)
//  - select({ id, externalUid, status, isManual }) -> "stale" (stale read, NO .limit())
let selectResults: Record<string, unknown[][]> = {};
function tagFor(projection: unknown): string {
  if (projection && typeof projection === "object") {
    const keys = Object.keys(projection as object);
    if (keys.includes("externalUid") && keys.includes("status")) return "stale";
  }
  return "full";
}
function consume(tag: string): unknown[] {
  const q = selectResults[tag];
  if (!q || q.length === 0) return [];
  return q.length > 1 ? q.shift()! : q[0];
}

const mockUpdateWhere = vi.fn((..._a: unknown[]) => Promise.resolve(undefined));
const mockUpdateSet = vi.fn((..._a: unknown[]): { where: typeof mockUpdateWhere } => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn((..._a: unknown[]): { set: typeof mockUpdateSet } => ({ set: mockUpdateSet }));

const mockInsertValues = vi.fn((..._a: unknown[]) => ({ returning: vi.fn().mockResolvedValue([{ id: "stay-new" }]) }));
const mockInsert = vi.fn((..._a: unknown[]): { values: typeof mockInsertValues } => ({ values: mockInsertValues }));

const mockSelect = vi.fn((projection?: unknown) => {
  const tag = tagFor(projection);
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => {
        const rows = () => Promise.resolve(consume(tag));
        return {
          limit: vi.fn().mockImplementation(rows),
          // stale-cancellation read awaits where() directly (no .limit())
          then: (onF?: (v: unknown[]) => unknown) => rows().then(onF),
        };
      }),
    })),
  };
});

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn((...a: unknown[]) => mockInsert(...a)),
    select: vi.fn((...a: unknown[]) => mockSelect(...a)),
    update: vi.fn((...a: unknown[]) => mockUpdate(...a)),
  },
}));

vi.mock("@/lib/turnover-generator", () => ({
  generateCleaningTasks: vi.fn().mockResolvedValue(undefined),
  cancelCleaningTasksForStay: vi.fn().mockResolvedValue(undefined),
}));

import { syncPropertyCalendar } from "@/lib/ical-sync";
import { cancelCleaningTasksForStay } from "@/lib/turnover-generator";

const ICAL_EMPTY = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Airbnb Inc//Hosting//EN
END:VCALENDAR`;

// A feed with exactly one booking, so stale logic has feedUids = {keep-uid}.
const ICAL_ONE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Airbnb Inc//Hosting//EN
BEGIN:VEVENT
DTSTART:20260701T140000Z
DTEND:20260705T110000Z
SUMMARY:Jane Doe
UID:keep-uid@airbnb.com
END:VEVENT
END:VCALENDAR`;

describe("syncPropertyCalendar — manual-stay guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults = {};
  });

  it("does NOT stale-cancel a stay with isManual=true when its uid leaves the feed", async () => {
    // Property has only an Airbnb feed whose single event has uid keep-uid.
    // DB has two stays:
    //   stay-feed: externalUid=gone-uid, isManual=false  → SHOULD be cancelled
    //   stay-manual: externalUid=gone-uid2, isManual=true → must NOT be touched
    selectResults = {
      full: [
        [{ id: "prop-1", airbnbIcalUrl: "https://example.com/cal.ics", googleCalendarId: null }],
        // upsert lookup for the single feed event → not found (would be a create)
        [],
      ],
      stale: [
        [
          { id: "stay-feed", externalUid: "gone-uid", status: "booked", isManual: false },
          { id: "stay-manual", externalUid: "gone-uid2", status: "booked", isManual: true },
        ],
      ],
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(ICAL_ONE),
    });

    const result = await syncPropertyCalendar("prop-1");
    expect(result.errors).toHaveLength(0);
    expect(result.cancelled).toBe(1);

    // The single stale-cancellation update must only name stay-feed
    const setCalls = mockUpdateSet.mock.calls.map((c) => c[0] as unknown as Record<string, unknown>);
    const cancellationCall = setCalls.find((s) => s.status === "cancelled");
    expect(cancellationCall).toBeDefined();
    // cancelCleaningTasksForStay called only for the non-manual stay
    expect(cancelCleaningTasksForStay).toHaveBeenCalledWith("stay-feed");
    expect(cancelCleaningTasksForStay).not.toHaveBeenCalledWith("stay-manual");
  });

  it("does NOT overwrite a manual stay when the feed carries the same uid with new data", async () => {
    // Feed has one event uid-abc with summary "Jane Doe".
    // The DB already holds a stay with externalUid=uid-abc, isManual=true, and a
    // DIFFERENT hash (human edited it). The sync must leave it alone.
    selectResults = {
      full: [
        [{ id: "prop-1", airbnbIcalUrl: "https://example.com/cal.ics", googleCalendarId: null }],
        // upsert lookup finds an existing MANUAL stay whose hash won't match the feed hash
        [{
          id: "stay-manual",
          externalUid: "keep-uid@airbnb.com",
          isManual: true,
          hash: "intentionally-different-hash",
          status: "booked",
        }],
      ],
      stale: [[]],
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(ICAL_ONE),
    });

    const result = await syncPropertyCalendar("prop-1");
    expect(result.errors).toHaveLength(0);
    expect(result.updated).toBe(0); // not overwritten
    expect(result.synced).toBe(1);  // counted as seen
    // No stay-row update should have been issued for the guard
    const setCalls = mockUpdateSet.mock.calls.map((c) => c[0] as unknown as Record<string, unknown>);
    expect(
      setCalls.some((s) => "hash" in s || "guestName" in s)
    ).toBe(false);
  });

  it("still cancels stale non-manual stays when feed excludes them", async () => {
    selectResults = {
      full: [
        [{ id: "prop-1", airbnbIcalUrl: "https://example.com/cal.ics", googleCalendarId: null }],
        [], // upsert lookup (feed has no events, but airbnb url present → still enters stale logic)
      ],
      stale: [
        [{ id: "stay-old", externalUid: "old-uid", status: "booked", isManual: false }],
      ],
    };
    // Empty feed: feedUids.size === 0 → stale block skipped per "if (feedUids.size > 0)".
    // To exercise the stale cancellation, we need at least one feed event.
    // So use ICAL_ONE here and pick a stale uid that is NOT in the feed.
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(ICAL_ONE),
    });

    const result = await syncPropertyCalendar("prop-1");
    expect(result.cancelled).toBe(1);
    expect(cancelCleaningTasksForStay).toHaveBeenCalledWith("stay-old");
  });
});
