import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncPropertyCalendar } from "@/lib/ical-sync";

// POST /api/properties/[id]/sync
// Manually trigger a calendar sync for a single property.
// Admin and manager only.
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
