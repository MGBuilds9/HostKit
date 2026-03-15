import { createHash } from "crypto";
import ical from "node-ical";
import { db } from "@/db";
import { properties, stays, syncLog, owners, accounts } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// ── Types ──────────────────────────────────────────────────────────────────

export type StayStatus = "booked" | "blocked" | "cancelled";

export interface ParsedStay {
  externalUid: string;
  startDate: Date;
  endDate: Date;
  summary: string;
  description: string;
  status: StayStatus;
  guestName: string | null;
  source: "airbnb" | "google";
}

export interface SyncResult {
  propertyId: string;
  synced: number;
  created: number;
  updated: number;
  cancelled: number;
  errors: string[];
}

// ── Status inference ───────────────────────────────────────────────────────

function inferAirbnbStatus(summary: string): StayStatus {
  const s = summary.trim().toLowerCase();
  if (s.includes("cancelled") || s.includes("canceled")) return "cancelled";
  if (s === "not available" || s === "airbnb (not available)") return "blocked";
  // "Reserved" or any guest name → booked
  return "booked";
}

function extractGuestName(summary: string, description: string): string | null {
  const s = summary.trim();
  const sl = s.toLowerCase();
  if (sl === "reserved") {
    // Airbnb sometimes puts the name in the description
    const match = description.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    return match ? match[1] : null;
  }
  if (
    sl === "not available" ||
    sl === "airbnb (not available)" ||
    sl.includes("cancelled") ||
    sl.includes("canceled")
  ) {
    return null;
  }
  // Non-generic summary — treat it as the guest name
  return s || null;
}

// ── iCal fetch + parse ─────────────────────────────────────────────────────

export async function fetchAndParseIcal(url: string): Promise<ParsedStay[]> {
  const response = await fetch(url, {
    headers: { "User-Agent": "HostKit/1.0 iCal-Sync" },
    // 15-second timeout via AbortSignal
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`iCal fetch failed: ${response.status} ${response.statusText}`);
  }

  const icsText = await response.text();
  const parsed = ical.parseICS(icsText);

  const results: ParsedStay[] = [];

  for (const key of Object.keys(parsed)) {
    const component = parsed[key];
    if (!component || component.type !== "VEVENT") continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = component as any;
    const uid = (event.uid as string | undefined) ?? "";
    if (!uid) continue;

    const start = event.start as Date | undefined;
    const end = event.end as Date | undefined;
    if (!start || !end) continue;

    const summary = ((event.summary as string | undefined) ?? "").trim();
    const description = ((event.description as string | undefined) ?? "").trim();

    const status = inferAirbnbStatus(summary);
    const guestName = extractGuestName(summary, description);

    results.push({
      externalUid: uid,
      startDate: start,
      endDate: end,
      summary,
      description,
      status,
      guestName,
      source: "airbnb",
    });
  }

  return results;
}

// ── Hash ───────────────────────────────────────────────────────────────────

export function computeStayHash(stay: ParsedStay): string {
  const raw = [
    stay.externalUid,
    stay.startDate.toISOString(),
    stay.endDate.toISOString(),
    stay.summary,
  ].join("|");
  return createHash("sha256").update(raw).digest("hex");
}

// ── Google Calendar helper ─────────────────────────────────────────────────

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

interface GoogleCalendarListResponse {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
  error?: { message: string };
}

function parseGoogleDate(dateObj?: { dateTime?: string; date?: string }): Date | null {
  if (!dateObj) return null;
  const raw = dateObj.dateTime ?? dateObj.date;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function inferGoogleStatus(event: GoogleCalendarEvent): StayStatus {
  if (event.status === "cancelled") return "cancelled";
  const summary = (event.summary ?? "").toLowerCase();
  if (summary.includes("cancelled") || summary.includes("canceled")) return "cancelled";
  if (summary.includes("blocked") || summary.includes("not available")) return "blocked";
  return "booked";
}

export async function fetchGoogleCalendarEvents(
  calendarId: string,
  accessToken: string
): Promise<ParsedStay[]> {
  const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const results: ParsedStay[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "2500",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const encodedId = encodeURIComponent(calendarId);
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events?${params}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as GoogleCalendarListResponse;
      throw new Error(
        `Google Calendar API error: ${response.status} — ${body.error?.message ?? response.statusText}`
      );
    }

    const data = (await response.json()) as GoogleCalendarListResponse;
    pageToken = data.nextPageToken;

    for (const event of data.items ?? []) {
      if (!event.id) continue;

      const startDate = parseGoogleDate(event.start);
      const endDate = parseGoogleDate(event.end);
      if (!startDate || !endDate) continue;

      const summary = (event.summary ?? "").trim();
      const description = (event.description ?? "").trim();
      const status = inferGoogleStatus(event);

      results.push({
        externalUid: event.id,
        startDate,
        endDate,
        summary,
        description,
        status,
        guestName: summary || null,
        source: "google",
      });
    }
  } while (pageToken);

  return results;
}

// ── Main sync function ─────────────────────────────────────────────────────

export async function syncPropertyCalendar(propertyId: string): Promise<SyncResult> {
  const result: SyncResult = {
    propertyId,
    synced: 0,
    created: 0,
    updated: 0,
    cancelled: 0,
    errors: [],
  };

  // Load property with owner
  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);

  if (!property) {
    result.errors.push(`Property ${propertyId} not found`);
    return result;
  }

  const allParsed: ParsedStay[] = [];

  // ── Airbnb iCal ─────────────────────────────────────────────────────────
  if (property.airbnbIcalUrl) {
    try {
      const airbnbStays = await fetchAndParseIcal(property.airbnbIcalUrl);
      allParsed.push(...airbnbStays);

      await db.insert(syncLog).values({
        propertyId,
        eventType: "fetch_airbnb",
        details: { count: airbnbStays.length, url: property.airbnbIcalUrl },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Airbnb iCal fetch error: ${msg}`);
      await db.insert(syncLog).values({
        propertyId,
        eventType: "error_airbnb",
        details: { error: msg },
      });
    }
  }

  // ── Google Calendar ──────────────────────────────────────────────────────
  if (property.googleCalendarId) {
    try {
      const accessToken = await resolveGoogleAccessToken(propertyId);
      if (!accessToken) {
        throw new Error("No Google OAuth access token found for property owner");
      }
      const googleStays = await fetchGoogleCalendarEvents(
        property.googleCalendarId,
        accessToken
      );
      allParsed.push(...googleStays);

      await db.insert(syncLog).values({
        propertyId,
        eventType: "fetch_google",
        details: { count: googleStays.length, calendarId: property.googleCalendarId },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Google Calendar fetch error: ${msg}`);
      await db.insert(syncLog).values({
        propertyId,
        eventType: "error_google",
        details: { error: msg },
      });
    }
  }

  // ── Upsert stays ─────────────────────────────────────────────────────────
  const feedUids = new Set<string>();

  for (const parsed of allParsed) {
    const hash = computeStayHash(parsed);
    feedUids.add(parsed.externalUid);

    try {
      const [existing] = await db
        .select()
        .from(stays)
        .where(
          and(
            eq(stays.propertyId, propertyId),
            eq(stays.externalUid, parsed.externalUid)
          )
        )
        .limit(1);

      if (!existing) {
        // Insert new stay
        await db.insert(stays).values({
          propertyId,
          source: parsed.source,
          status: parsed.status,
          guestName: parsed.guestName,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          rawSummary: parsed.summary,
          rawDescription: parsed.description,
          externalUid: parsed.externalUid,
          hash,
        });
        result.created++;
        result.synced++;
      } else if (existing.hash !== hash) {
        // Hash changed → update
        await db
          .update(stays)
          .set({
            source: parsed.source,
            status: parsed.status,
            guestName: parsed.guestName,
            startDate: parsed.startDate,
            endDate: parsed.endDate,
            rawSummary: parsed.summary,
            rawDescription: parsed.description,
            hash,
            updatedAt: new Date(),
          })
          .where(eq(stays.id, existing.id));
        result.updated++;
        result.synced++;
      } else {
        // No change
        result.synced++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Upsert error for uid ${parsed.externalUid}: ${msg}`);
    }
  }

  // ── Mark stale external stays as cancelled ────────────────────────────────
  // Only touch synced-source stays (airbnb/google), not manual entries
  if (feedUids.size > 0) {
    try {
      const activeSources: Array<"airbnb" | "google"> = [];
      if (property.airbnbIcalUrl) activeSources.push("airbnb");
      if (property.googleCalendarId) activeSources.push("google");

      if (activeSources.length > 0) {
        const dbStays = await db
          .select({ id: stays.id, externalUid: stays.externalUid, status: stays.status })
          .from(stays)
          .where(
            and(
              eq(stays.propertyId, propertyId),
              inArray(stays.source, activeSources)
            )
          );

        const staleIds = dbStays
          .filter(
            (s) =>
              s.externalUid !== null &&
              !feedUids.has(s.externalUid!) &&
              s.status !== "cancelled"
          )
          .map((s) => s.id);

        if (staleIds.length > 0) {
          await db
            .update(stays)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(inArray(stays.id, staleIds));
          result.cancelled += staleIds.length;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Stale-cancellation error: ${msg}`);
    }
  }

  // ── Update property sync metadata ─────────────────────────────────────────
  const syncStatus = result.errors.length === 0 ? "ok" : "error";
  await db
    .update(properties)
    .set({
      lastSyncAt: new Date(),
      lastSyncStatus: syncStatus,
      lastSyncError: result.errors.length > 0 ? result.errors.join("; ") : null,
      updatedAt: new Date(),
    })
    .where(eq(properties.id, propertyId));

  // ── Final sync log entry ───────────────────────────────────────────────────
  await db.insert(syncLog).values({
    propertyId,
    eventType: "sync_complete",
    details: {
      synced: result.synced,
      created: result.created,
      updated: result.updated,
      cancelled: result.cancelled,
      errors: result.errors,
      status: syncStatus,
    },
  });

  return result;
}

// ── All-properties sync ────────────────────────────────────────────────────

export async function syncAllCalendars(): Promise<{
  results: SyncResult[];
  totalSynced: number;
}> {
  const enabledProperties = await db
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.icalSyncEnabled, true));

  const results = await Promise.allSettled(
    enabledProperties.map((p) => syncPropertyCalendar(p.id))
  );

  const syncResults: SyncResult[] = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      propertyId: enabledProperties[i].id,
      synced: 0,
      created: 0,
      updated: 0,
      cancelled: 0,
      errors: [r.reason instanceof Error ? r.reason.message : String(r.reason)],
    };
  });

  const totalSynced = syncResults.reduce((acc, r) => acc + r.synced, 0);

  return { results: syncResults, totalSynced };
}

// ── Internal helpers ───────────────────────────────────────────────────────

/**
 * Resolves the Google OAuth access token for the owner of a given property.
 * Looks up: property → owner → user → accounts (provider = "google").
 */
async function resolveGoogleAccessToken(propertyId: string): Promise<string | null> {
  const [property] = await db
    .select({ ownerId: properties.ownerId })
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);

  if (!property) return null;

  const [owner] = await db
    .select({ userId: owners.userId })
    .from(owners)
    .where(eq(owners.id, property.ownerId))
    .limit(1);

  if (!owner?.userId) return null;

  const [account] = await db
    .select({ access_token: accounts.access_token })
    .from(accounts)
    .where(
      and(eq(accounts.userId, owner.userId), eq(accounts.provider, "google"))
    )
    .limit(1);

  return account?.access_token ?? null;
}
