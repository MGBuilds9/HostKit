import { NextRequest, NextResponse } from "next/server";
import { syncPropertyCalendar } from "@/lib/ical-sync";
import { authorizePropertyCalendarActor } from "@/lib/property-calendar-access";

// POST /api/properties/[id]/sync
// Manually trigger a calendar sync for a single property.
// Admin, manager, or the property's own owner. Cleaners cannot.
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await authorizePropertyCalendarActor(params.id);
  if (gate.kind === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (gate.kind === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (gate.kind === "not_found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await syncPropertyCalendar(params.id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[properties/${params.id}/sync] Error:`, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
