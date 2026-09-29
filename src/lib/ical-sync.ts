import { createHash } from "crypto";
import ical from "node-ical";
import { db } from "@/db";
import { properties, stays, syncLog, owners, accounts } from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { generateCleaningTasks, cancelCleaningTasksForStay } from "@/lib/turnover-generator";
import { parseAirbnbDescription, parseGoogleEvent, type ParsedDetails } from "@/lib/parse-stay-details";
import { refreshGoogleAccessToken, GoogleCredentialsRevokedError, GoogleRefreshTransientError } from "@/lib/google-token";

// ── Google auth UX contract ────────────────────────────────────────────────
// Exact actionable messages written to properties.lastSyncError (and surfaced
// in the UI) when Google auth fails during a sync run.
export const GOOGLE_CREDENTIALS_REVOKED_MESSAGE =
  "Google credentials revoked — reconnect the calendar in property settings";

// ── Types ──────────────────────────────────────────────────────────────────

export type StayStatus = "booked" | "blocked" | "cancelled";

export interface ParsedStay extends ParsedDetails {
  externalUid: string;
  startDate: Date;
  endDate: Date;
  summary: string;
  description: string;
  status: StayStatus;
  guestName: string | null;
  source: "airbnb" | "google";
}

/** Predictions from a dry run. These are not committed writes. */
export interface SyncPreviewCounts {
  wouldCreate: number;
  wouldUpdate: number;
  wouldCancel: number;
}

export interface SyncResult {
  propertyId: string;
  synced: number;
  created: number;
  updated: number;
  /**
   * Live run: stays marked cancelled.
   * Dry run: the same number is a prediction and is copied to preview.wouldCancel.
   */
  cancelled: number;
  errors: string[];
  /** True when the run was a preview (no DB writes). */
  dryRun?: boolean;
  /** Present only when dryRun is true. Names created/updated/cancelled as predictions. */
  preview?: SyncPreviewCounts;
}

/** Options for a sync run. dryRun previews changes without writing to the DB. */
export interface SyncOptions {
  dryRun?: boolean;
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
    const details = parseAirbnbDescription(summary, description);
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
      ...details,
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
    // Include enriched details so a change in them is detected as an update.
    stay.guestName ?? "",
    stay.guestEmail ?? "",
    stay.guestPhone ?? "",
    String(stay.guestCount ?? ""),
    stay.confirmationCode ?? "",
    stay.bookingUrl ?? "",
    stay.eventLocation ?? "",
  ].join("|");
  return createHash("sha256").update(raw).digest("hex");
}

// ── Google Calendar helper ─────────────────────────────────────────────────

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  status?: string;
  location?: string;
  htmlLink?: string;
  attendees?: Array<{ email?: string; displayName?: string }>;
  extendedProperties?: { private?: Record<string, string>; shared?: Record<string, string> };
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
  const seenPageTokens = new Set<string>();
  let pages = 0;
  const maxPages = 20;

  do {
    if (pageToken) {
      if (seenPageTokens.has(pageToken)) {
        throw new Error("Google Calendar pagination repeated a page token");
      }
      seenPageTokens.add(pageToken);
    }
    pages += 1;
    if (pages > maxPages) {
      throw new Error("Google Calendar pagination exceeded 20 pages");
    }

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
      const details = parseGoogleEvent(event);

      results.push({
        externalUid: event.id,
        startDate,
        endDate,
        summary,
        description,
        status,
        guestName: summary || null,
        source: "google",
        ...details,
        // Prefer the parsed bookingUrl; fall back to the event's htmlLink.
        bookingUrl: details.bookingUrl ?? event.htmlLink ?? null,
      });
    }
  } while (pageToken);

  return results;
}

// ── Main sync function ─────────────────────────────────────────────────────

export async function syncPropertyCalendar(
  propertyId: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const dryRun = options.dryRun === true;
  const result: SyncResult = {
    propertyId,
    synced: 0,
    created: 0,
    updated: 0,
    cancelled: 0,
    errors: [],
    dryRun: dryRun || undefined,
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

  // Fetch/refresh failure flags per source. A source that errored must be
  // excluded from stale-cancellation: a dead Google token must never wipe
  // existing bookings. A calendar-id swap is a separate guard below — a
  // successful fetch of a new calendar is not a leg failure, but its event
  // ids do not match the previous calendar's stays.
  let googleLegFailed = false;
  let airbnbFetchFailed = false;
  let googleCalendarUnproven = false;

  // ── Airbnb iCal ─────────────────────────────────────────────────────────
  if (property.airbnbIcalUrl) {
    try {
      const airbnbStays = await fetchAndParseIcal(property.airbnbIcalUrl);
      allParsed.push(...airbnbStays);

      if (!dryRun) {
        await db.insert(syncLog).values({
          propertyId,
          eventType: "fetch_airbnb",
          details: { count: airbnbStays.length, url: property.airbnbIcalUrl },
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Airbnb iCal fetch error: ${msg}`);
      airbnbFetchFailed = true;
      if (!dryRun) {
        await db.insert(syncLog).values({
          propertyId,
          eventType: "error_airbnb",
          details: { error: msg },
        });
      }
    }
  }

  // ── Google Calendar ──────────────────────────────────────────────────────
  if (property.googleCalendarId) {
    // Read the previous successful fetch BEFORE this run writes its own log.
    // Stale-cancel is safe only when that log used this same calendar id.
    const previousCalendarId = await lastFetchedGoogleCalendarId(propertyId);
    googleCalendarUnproven = previousCalendarId !== property.googleCalendarId;
    try {
      const accessToken = await resolveGoogleAccessToken(propertyId, {
        persist: !dryRun,
      });
      // Sentinel — mapped to an actionable human message in the catch block.
      if (!accessToken) {
        throw new Error("no_google_account");
      }
      const googleStays = await fetchGoogleCalendarEvents(
        property.googleCalendarId,
        accessToken
      );
      allParsed.push(...googleStays);

      if (!dryRun) {
        await db.insert(syncLog).values({
          propertyId,
          eventType: "fetch_google",
          details: { count: googleStays.length, calendarId: property.googleCalendarId },
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const revoked = err instanceof GoogleCredentialsRevokedError;
      const transient = err instanceof GoogleRefreshTransientError;
      const noAccount = msg === "no_google_account";
      // Only a genuinely-revoked (or missing) credential gets the "reconnect"
      // CTA. A transient refresh failure (Google 5xx / timeout) is a normal
      // sync error and must NOT write the scary reconnect message: the stored
      // access token may still be valid, and we surface "Google refresh
      // temporarily unavailable; will retry" instead.
      const authError = revoked || noAccount;
      // Actionable, human-readable message for auth failures; raw error text otherwise.
      const displayMsg = noAccount
        ? "No Google OAuth access token found for property owner"
        : revoked
          ? `Google Calendar fetch error: ${GOOGLE_CREDENTIALS_REVOKED_MESSAGE}`
          : transient
            ? `Google Calendar fetch error: temporary Google token refresh failure (will retry)`
            : `Google Calendar fetch error: ${msg}`;
      result.errors.push(displayMsg);
      // authError drives a distinct syncLog eventType (error_google_auth) so
      // the UI can render a reconnect CTA. ANY google-leg error excludes
      // 'google' from stale-cancellation. A transient failure also fails the
      // leg, and is logged as error_google rather than error_google_auth.
      googleLegFailed = true;
      if (!dryRun) {
        await db.insert(syncLog).values({
          propertyId,
          eventType: authError ? "error_google_auth" : "error_google",
          details: { error: msg, revoked, transient },
        });
      }
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
        result.created++;
        result.synced++;
        if (dryRun) continue;

        const [inserted] = await db.insert(stays).values({
          propertyId,
          source: parsed.source,
          status: parsed.status,
          guestName: parsed.guestName,
          guestEmail: parsed.guestEmail ?? null,
          guestPhone: parsed.guestPhone ?? null,
          guestCount: parsed.guestCount ?? null,
          confirmationCode: parsed.confirmationCode ?? null,
          bookingUrl: parsed.bookingUrl ?? null,
          eventLocation: parsed.eventLocation ?? null,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          rawSummary: parsed.summary,
          rawDescription: parsed.description,
          externalUid: parsed.externalUid,
          hash,
        }).returning();

        // Generate cleaning tasks for booked stays
        if (parsed.status === "booked") {
          try { await generateCleaningTasks(inserted.id); } catch (e) {
            console.error(`[ical-sync] generateCleaningTasks failed for stay ${inserted.id}:`, e);
          }
        }
      } else if (existing.isManual) {
        // Never overwrite a human-managed stay from the feed.
        result.synced++;
      } else if (existing.hash !== hash) {
        // Hash changed → update
        result.updated++;
        result.synced++;
        if (dryRun) continue;

        await db
          .update(stays)
          .set({
            source: parsed.source,
            status: parsed.status,
            guestName: parsed.guestName,
            guestEmail: parsed.guestEmail ?? null,
            guestPhone: parsed.guestPhone ?? null,
            guestCount: parsed.guestCount ?? null,
            confirmationCode: parsed.confirmationCode ?? null,
            bookingUrl: parsed.bookingUrl ?? null,
            eventLocation: parsed.eventLocation ?? null,
            startDate: parsed.startDate,
            endDate: parsed.endDate,
            rawSummary: parsed.summary,
            rawDescription: parsed.description,
            hash,
            updatedAt: new Date(),
          })
          .where(eq(stays.id, existing.id));

        // Re-generate or cancel cleaning tasks based on new status
        try {
          if (parsed.status === "cancelled") {
            await cancelCleaningTasksForStay(existing.id);
          } else if (parsed.status === "booked") {
            await generateCleaningTasks(existing.id);
          }
        } catch (e) {
          console.error(`[ical-sync] task generation failed for stay ${existing.id}:`, e);
        }
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

      // Never cancel stays for a source whose fetch failed this run.
      // Also skip Google when this calendar id has no prior successful fetch:
      // the first sync after a calendar swap must not cancel the previous
      // calendar's bookings. The next sync, once the log matches, may.
      let staleSources = activeSources;
      if (googleLegFailed || googleCalendarUnproven) {
        staleSources = staleSources.filter((s) => s !== "google");
      }
      if (airbnbFetchFailed) staleSources = staleSources.filter((s) => s !== "airbnb");

      if (staleSources.length > 0) {
        const dbStays = await db
          .select({ id: stays.id, externalUid: stays.externalUid, status: stays.status, isManual: stays.isManual })
          .from(stays)
          .where(
            and(
              eq(stays.propertyId, propertyId),
              inArray(stays.source, staleSources)
            )
          );

        // Never stale-cancel a stay a human touched (isManual = true).
        const staleIds = dbStays
          .filter(
            (s) =>
              s.externalUid !== null &&
              !feedUids.has(s.externalUid!) &&
              s.status !== "cancelled" &&
              !s.isManual
          )
          .map((s) => s.id);

        if (staleIds.length > 0) {
          if (!dryRun) {
            await db
              .update(stays)
              .set({ status: "cancelled", updatedAt: new Date() })
              .where(inArray(stays.id, staleIds));

            // Cancel cleaning tasks for stale stays
            for (const staleId of staleIds) {
              try { await cancelCleaningTasksForStay(staleId); } catch (e) {
                console.error(`[ical-sync] cancelCleaningTasksForStay failed for ${staleId}:`, e);
              }
            }
          }
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
  if (!dryRun) {
    await db
      .update(properties)
      .set({
        lastSyncAt: new Date(),
        lastSyncStatus: syncStatus,
        lastSyncError: result.errors.length > 0 ? result.errors.join("; ") : null,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, propertyId));

    // ── Final sync log entry ─────────────────────────────────────────────────
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
        dryRun: false,
      },
    });
  }

  if (dryRun) {
    result.preview = {
      wouldCreate: result.created,
      wouldUpdate: result.updated,
      wouldCancel: result.cancelled,
    };
  }

  return result;
}

// ── All-properties sync ────────────────────────────────────────────────────

export async function syncAllCalendars(options: SyncOptions = {}): Promise<{
  results: SyncResult[];
  totalSynced: number;
}> {
  const enabledProperties = await db
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.icalSyncEnabled, true));

  const results = await Promise.allSettled(
    enabledProperties.map((p) => syncPropertyCalendar(p.id, options))
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

/** Calendar id recorded on the latest successful Google fetch, if any. */
async function lastFetchedGoogleCalendarId(propertyId: string): Promise<string | null> {
  const [row] = await db
    .select({
      eventType: syncLog.eventType,
      details: syncLog.details,
    })
    .from(syncLog)
    .where(
      and(eq(syncLog.propertyId, propertyId), eq(syncLog.eventType, "fetch_google"))
    )
    .orderBy(desc(syncLog.eventTime))
    .limit(1);

  if (!row?.details || typeof row.details !== "object") return null;
  const calendarId = (row.details as { calendarId?: unknown }).calendarId;
  return typeof calendarId === "string" && calendarId.length > 0 ? calendarId : null;
}

/**
 * Resolves the Google OAuth access token for the calendar connected to a
 * given property.
 *
 * Resolution order:
 *   1. properties.calendarConnectedByUserId — the user who explicitly
 *      connected the calendar (wins when set).
 *   2. Legacy fallback when null: property.ownerId → owners.userId.
 * Then: accounts row WHERE userId AND provider='google'. An explicit pointer
 * whose user has no google account returns null — we never fall through to
 * the owner's account in that case.
 *
 * Expired tokens are refreshed via refreshGoogleAccessToken; a refused
 * refresh (invalid_grant / revoked) throws GoogleCredentialsRevokedError so
 * callers never call the Calendar API with a dead token.
 *
 * Exported so it can be unit-tested directly (token-valid / expired-refresh /
 * refresh-denied paths) without going through a full sync.
 *
 * persist defaults to true. A dry-run passes false so the preview can use a
 * refreshed access token without writing accounts.
 */
export async function resolveGoogleAccessToken(
  propertyId: string,
  options?: { persist?: boolean }
): Promise<string | null> {
  const [property] = await db
    .select({
      calendarConnectedByUserId: properties.calendarConnectedByUserId,
      ownerId: properties.ownerId,
    })
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);

  if (!property) return null;

  let userId = property.calendarConnectedByUserId;

  if (!userId) {
    const [owner] = await db
      .select({ userId: owners.userId })
      .from(owners)
      .where(eq(owners.id, property.ownerId))
      .limit(1);

    if (!owner?.userId) return null;
    userId = owner.userId;
  }

  const [account] = await db
    .select({
      provider: accounts.provider,
      providerAccountId: accounts.providerAccountId,
      access_token: accounts.access_token,
      refresh_token: accounts.refresh_token,
      expires_at: accounts.expires_at,
    })
    .from(accounts)
    .where(
      and(eq(accounts.userId, userId), eq(accounts.provider, "google"))
    )
    .limit(1);

  if (!account) return null;

  // Check if token is expired or will expire within 60 seconds
  const nowSecs = Math.floor(Date.now() / 1000);
  const isExpired = account.expires_at !== null && account.expires_at <= nowSecs + 60;

  if (isExpired) {
    if (!account.refresh_token?.trim()) {
      throw new GoogleCredentialsRevokedError();
    }
    // invalid_grant throws GoogleCredentialsRevokedError.
    // 429/5xx/timeout throw GoogleRefreshTransientError. Both propagate.
    const data = await refreshGoogleAccessToken(account);
    const newExpiresAt = Math.floor(Date.now() / 1000) + data.expires_in;

    if (options?.persist !== false) {
      await db
        .update(accounts)
        .set({
          access_token: data.access_token,
          expires_at: newExpiresAt,
        })
        .where(
          and(
            eq(accounts.provider, account.provider),
            eq(accounts.providerAccountId, account.providerAccountId)
          )
        );
    }

    return data.access_token;
  }

  return account.access_token ?? null;
}
