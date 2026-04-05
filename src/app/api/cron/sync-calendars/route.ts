import { NextRequest, NextResponse } from "next/server";
import { syncAllCalendars } from "@/lib/ical-sync";
import { rateLimit } from "@/lib/rate-limit";

// 1 request per minute globally (not per-IP — cron callers share a single limiter)
const cronLimiter = rateLimit({ windowMs: 60_000, maxRequests: 1 });

// POST /api/cron/sync-calendars
// Called by cron (e.g. Vercel Cron, external scheduler).
// Auth is via a shared secret, NOT session cookies.
export async function POST(request: NextRequest) {
  // Rate limit: 1 request per minute globally
  const limit = cronLimiter.check("global");
  if (!limit.success) {
    const retryAfter = Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many requests", retryAfter },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { results, totalSynced } = await syncAllCalendars();

    const errorCount = results.reduce((acc, r) => acc + r.errors.length, 0);

    return NextResponse.json({
      ok: true,
      propertiesProcessed: results.length,
      totalSynced,
      errorCount,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/sync-calendars] Unexpected error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
