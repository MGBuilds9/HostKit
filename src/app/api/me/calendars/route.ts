import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  refreshGoogleAccessToken,
  GoogleCredentialsRevokedError,
  GoogleRefreshTransientError,
} from "@/lib/google-token";
import {
  googleCalendarListEntrySchema,
  googleCalendarListResponseSchema,
} from "@/lib/validators";

// GET /api/me/calendars
// Lists the signed-in user's writable Google calendars so they can pick
// which one to connect to a property (CONNECT-CALENDAR onboarding).
//
// Errors:
//   401 — no session.
//   409 { error: "no_google_account", reconnectUrl }
//   502 { error: "google_auth_failed", message, reconnectUrl }
//        Google rejected the grant (invalid_grant) or the Calendar API returned
//        401/403. Reconnect with consent.
//   502 { error: "google_list_failed", message }
//        Pagination repeated or the list response was unusable. Do not reconnect.
//   503 { error: "google_temporarily_unavailable" }
//        Refresh or Calendar list failed transiently (429/5xx/timeout/network).
//
// reconnectUrl is /login?prompt=consent for logged-out clients. A page that
// already has a session must call signIn("google", …, { prompt: "consent" })
// because middleware redirects a logged-in visit to /login away to /admin.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [account] = await db
    .select()
    .from(accounts)
    .where(
      and(eq(accounts.userId, session.user.id), eq(accounts.provider, "google"))
    )
    .limit(1);

  if (!account) {
    // H-M1: include a reconnect URL so the client can render a usable CTA.
    return NextResponse.json(
      {
        error: "no_google_account",
        reconnectUrl: "/login?prompt=consent",
      },
      { status: 409 }
    );
  }

  // Refresh if expired (or within 60s of expiry) using the shared helper
  // (src/lib/google-token.ts). H2: persist the fresh token back to accounts so
  // a settings page open and the next cron tick don't double-refresh / clobber.
  let accessToken: string | null = account.access_token;
  const nowSecs = Math.floor(Date.now() / 1000);
  const isExpired = account.expires_at !== null && account.expires_at <= nowSecs + 60;

  if (isExpired && account.refresh_token) {
    try {
      const refreshed = await refreshGoogleAccessToken({
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token,
      });
      accessToken = refreshed.access_token;
      const newExpiresAt = Math.floor(Date.now() / 1000) + refreshed.expires_in;
      try {
        await db
          .update(accounts)
          .set({ access_token: refreshed.access_token, expires_at: newExpiresAt })
          .where(
            and(
              eq(accounts.provider, account.provider),
              eq(accounts.providerAccountId, account.providerAccountId)
            )
          );
      } catch (err) {
        console.error("[me/calendars] failed to persist refreshed access token");
        console.error(err instanceof Error ? err.name : "persist_failed");
      }
    } catch (err) {
      if (err instanceof GoogleCredentialsRevokedError) {
        return NextResponse.json(
          {
            error: "google_auth_failed",
            message: "Google access was revoked. Reconnect to continue.",
            reconnectUrl: "/login?prompt=consent",
          },
          { status: 502 }
        );
      }
      if (err instanceof GoogleRefreshTransientError) {
        return NextResponse.json(
          {
            error: "google_temporarily_unavailable",
            message: "Google token refresh is temporarily unavailable. Try again shortly.",
          },
          { status: 503 }
        );
      }
      throw err;
    }
  }

  if (!accessToken) {
    return NextResponse.json(
      {
        error: "google_auth_failed",
        message: "Your Google session has expired. Reconnect to continue.",
      },
      { status: 502 }
    );
  }

  // Paginate calendarList.list — minAccessRole=writer filters out read-only
  // shared calendars that we couldn't write stays to.
  const calendars: Array<{ id: string; summary: string; primary: boolean }> = [];
  let pageToken: string | undefined;
  const seenPageTokens = new Set<string>();
  let pages = 0;
  const maxPages = 10;

  try {
    do {
      if (pageToken) {
        if (seenPageTokens.has(pageToken)) {
          return NextResponse.json(
            {
              error: "google_list_failed",
              message: "Google Calendar pagination repeated a page token",
            },
            { status: 502 }
          );
        }
        seenPageTokens.add(pageToken);
      }
      pages += 1;
      if (pages > maxPages) {
        return NextResponse.json(
          {
            error: "google_list_failed",
            message: "Google Calendar list exceeded the page limit",
          },
          { status: 502 }
        );
      }

      const url = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
      url.searchParams.set("minAccessRole", "writer");
      url.searchParams.set("maxResults", "250");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
      });

      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          {
            error: "google_auth_failed",
            message: "Google rejected your session — reconnect the calendar.",
            reconnectUrl: "/login?prompt=consent",
          },
          { status: 502 }
        );
      }
      if (res.status === 429 || res.status >= 500) {
        return NextResponse.json(
          {
            error: "google_temporarily_unavailable",
            message: "Google Calendar is temporarily unavailable. Try again shortly.",
          },
          { status: 503 }
        );
      }
      if (!res.ok) {
        return NextResponse.json(
          {
            error: "google_list_failed",
            message: "Google Calendar list failed.",
          },
          { status: 502 }
        );
      }

      const data = (await res.json()) as {
        items?: Array<{ id?: unknown; summary?: unknown; primary?: unknown }>;
        nextPageToken?: string;
      };

      for (const item of data.items ?? []) {
        const entry = googleCalendarListEntrySchema.safeParse({
          id: item.id,
          summary: item.summary,
          primary: item.primary === true,
        });
        if (entry.success) calendars.push(entry.data);
      }

      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    const transient =
      name === "TimeoutError" || name === "AbortError" || err instanceof TypeError;
    if (transient) {
      return NextResponse.json(
        {
          error: "google_temporarily_unavailable",
          message: "Google Calendar is temporarily unavailable. Try again shortly.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        error: "google_list_failed",
        message: "Google Calendar list failed.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json(
    googleCalendarListResponseSchema.parse({ calendars })
  );
}
