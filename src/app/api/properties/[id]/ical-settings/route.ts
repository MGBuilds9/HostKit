import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";
import { icalSettingsSchema, turnoverRulesSchema } from "@/lib/validators";

// Combined schema: iCal settings + turnover rules, both fully partial
const icalAndTurnoverSchema = icalSettingsSchema.merge(turnoverRulesSchema).partial();

// PUT /api/properties/[id]/ical-settings
// Updates the iCal sync settings and/or turnover rules on a property.
// Admin/manager only.
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = icalAndTurnoverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    airbnbIcalUrl,
    googleCalendarId,
    icalSyncEnabled,
    syncIntervalMinutes,
    cleanOn,
    cleanStartOffsetHours,
    cleanDurationHours,
    defaultCleanerId,
    sameDayTurnAllowed,
    timezone,
  } = parsed.data;

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (airbnbIcalUrl !== undefined) updates.airbnbIcalUrl = airbnbIcalUrl || null;
  if (googleCalendarId !== undefined) updates.googleCalendarId = googleCalendarId || null;
  if (icalSyncEnabled !== undefined) updates.icalSyncEnabled = icalSyncEnabled;
  if (syncIntervalMinutes !== undefined) updates.syncIntervalMinutes = syncIntervalMinutes;
  if (cleanOn !== undefined) updates.cleanOn = cleanOn;
  if (cleanStartOffsetHours !== undefined) updates.cleanStartOffsetHours = cleanStartOffsetHours;
  if (cleanDurationHours !== undefined) updates.cleanDurationHours = cleanDurationHours;
  if (defaultCleanerId !== undefined) updates.defaultCleanerId = defaultCleanerId || null;
  if (sameDayTurnAllowed !== undefined) updates.sameDayTurnAllowed = sameDayTurnAllowed;
  if (timezone !== undefined) updates.timezone = timezone;

  const [updated] = await db
    .update(properties)
    .set(updates)
    .where(eq(properties.id, params.id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}
