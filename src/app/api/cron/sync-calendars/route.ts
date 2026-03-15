import { NextRequest, NextResponse } from "next/server";
import { syncAllCalendars } from "@/lib/ical-sync";

// POST /api/cron/sync-calendars
// Called by cron (e.g. Vercel Cron, external scheduler).
// Auth is via a shared secret, NOT session cookies.
export async function POST(request: NextRequest) {
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
