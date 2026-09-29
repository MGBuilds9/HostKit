import { NextRequest, NextResponse } from "next/server";
import { syncAllCalendars } from "@/lib/ical-sync";

// POST /api/cron/sync-calendars/dry-run
// Preview what a calendar sync WOULD do without writing anything to the DB.
// Same CRON_SECRET bearer auth as the real cron. Safe to call repeatedly:
// syncAllCalendars({ dryRun: true }) performs zero inserts/updates/deletes.
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
    const { results, totalSynced } = await syncAllCalendars({ dryRun: true });
    const errorCount = results.reduce((acc, r) => acc + r.errors.length, 0);
    return NextResponse.json({
      ok: true,
      dryRun: true,
      propertiesProcessed: results.length,
      totalSynced,
      errorCount,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/sync-calendars/dry-run] Unexpected error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
