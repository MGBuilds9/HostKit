import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, properties } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { connectCalendarBodySchema } from "@/lib/validators";
import { authorizePropertyCalendarActor } from "@/lib/property-calendar-access";

// /api/properties/[id]/calendar-connection
// Manages the "who connected this calendar" pointer on a property.
//
// properties.calendarConnectedByUserId — when set, sync resolves Google
// credentials through THIS user. Null falls back to property.ownerId →
// owners.userId. POST sets the pointer. DELETE clears it.
//
// Role gate: admin, manager, or the property's owner. See
// authorizePropertyCalendarActor. Manager is portal-wide, not per-property.
//
// POST requires a non-empty refresh_token. A still-valid access token is not
// enough: the cron cannot refresh it later. 409 reconnect_required points at
// /login?prompt=consent so Google re-issues a refresh token. Logged-in pages
// should call signIn() with prompt=consent instead of navigating to /login
// (middleware sends an existing session away from /login).
//
// Optional JSON body { googleCalendarId } also stores that id and turns
// iCal sync on. Owners use this because they cannot PUT /ical-settings.

const RECONNECT_URL = "/login?prompt=consent";

interface RouteContext {
  params: { id: string };
}

function gateResponse(kind: "unauthorized" | "forbidden" | "not_found") {
  if (kind === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (kind === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const gate = await authorizePropertyCalendarActor(params.id);
  if (gate.kind !== "ok") return gateResponse(gate.kind);

  let googleCalendarId: string | undefined;
  const raw = await request.text();
  if (raw.trim()) {
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = connectCalendarBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    googleCalendarId = parsed.data.googleCalendarId;
  }

  const [account] = await db
    .select({
      refresh_token: accounts.refresh_token,
    })
    .from(accounts)
    .where(
      and(eq(accounts.userId, gate.sessionUserId), eq(accounts.provider, "google"))
    )
    .limit(1);

  if (!account?.refresh_token?.trim()) {
    return NextResponse.json(
      { error: "reconnect_required", reconnectUrl: RECONNECT_URL },
      { status: 409 }
    );
  }

  const patch: {
    calendarConnectedByUserId: string;
    updatedAt: Date;
    googleCalendarId?: string;
    icalSyncEnabled?: boolean;
  } = {
    calendarConnectedByUserId: gate.sessionUserId,
    updatedAt: new Date(),
  };
  if (googleCalendarId) {
    patch.googleCalendarId = googleCalendarId;
    patch.icalSyncEnabled = true;
  }

  const [updated] = await db
    .update(properties)
    .set(patch)
    .where(eq(properties.id, params.id))
    .returning({
      id: properties.id,
      calendarConnectedByUserId: properties.calendarConnectedByUserId,
      googleCalendarId: properties.googleCalendarId,
      icalSyncEnabled: properties.icalSyncEnabled,
    });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const gate = await authorizePropertyCalendarActor(params.id);
  if (gate.kind !== "ok") return gateResponse(gate.kind);

  const [updated] = await db
    .update(properties)
    .set({
      calendarConnectedByUserId: null,
      updatedAt: new Date(),
    })
    .where(eq(properties.id, params.id))
    .returning({
      id: properties.id,
      calendarConnectedByUserId: properties.calendarConnectedByUserId,
    });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}
