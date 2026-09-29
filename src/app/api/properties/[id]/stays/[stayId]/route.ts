import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { stays, owners } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { stayUpdateSchema } from "@/lib/validators";
import { cancelCleaningTasksForStay } from "@/lib/turnover-generator";

// GET /api/properties/[id]/stays/[stayId]
// Returns a single stay. Admin/manager/owner; owners are scoped to their
// own properties (mirrors the stays collection GET).
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; stayId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  const propertyId = params.id;

  if (role === "owner") {
    const owner = await db.query.owners.findFirst({
      where: eq(owners.userId, session.user.id),
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const property = await db.query.properties.findFirst({
      where: (p, { eq: eqFn }) => eqFn(p.id, propertyId),
    });
    if (!property || property.ownerId !== owner.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (role === "cleaner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [stay] = await db
    .select()
    .from(stays)
    .where(and(eq(stays.id, params.stayId), eq(stays.propertyId, propertyId)))
    .limit(1);

  if (!stay) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(stay);
}

// PATCH /api/properties/[id]/stays/[stayId]
// Admin/manager only. Any admin edit marks the stay manual so future iCal
// syncs never override it.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; stayId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const propertyId = params.id;
  const body = await request.json();
  const parsed = stayUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { status, guestName, startDate, endDate, rawSummary, rawDescription, isManual } =
    parsed.data;

  const updates: Record<string, unknown> = {
    // Editing by a human marks the stay manual so the iCal sync never stomps it.
    isManual: true,
    updatedAt: new Date(),
  };
  if (status !== undefined) updates.status = status;
  if (guestName !== undefined) updates.guestName = guestName;
  if (startDate !== undefined) updates.startDate = startDate;
  if (endDate !== undefined) updates.endDate = endDate;
  if (rawSummary !== undefined) updates.rawSummary = rawSummary;
  if (rawDescription !== undefined) updates.rawDescription = rawDescription;
  // Explicit caller-supplied isManual is honored (though edits already force it true).
  if (isManual !== undefined) updates.isManual = isManual;

  const [updated] = await db
    .update(stays)
    .set(updates)
    .where(and(eq(stays.id, params.stayId), eq(stays.propertyId, propertyId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}

// DELETE /api/properties/[id]/stays/[stayId]
// Admin only. Deletes the stay and cancels its cleaning tasks.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; stayId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const propertyId = params.id;

  // Confirm the stay exists under this property before deleting.
  const [existing] = await db
    .select({ id: stays.id })
    .from(stays)
    .where(and(eq(stays.id, params.stayId), eq(stays.propertyId, propertyId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cancel cleaning tasks first so no orphan tasks outlive the stay.
  try {
    await cancelCleaningTasksForStay(existing.id);
  } catch (e) {
    console.error("[stays/DELETE] cancelCleaningTasksForStay failed:", e);
  }

  await db.delete(stays).where(eq(stays.id, existing.id));

  return NextResponse.json({ ok: true });
}
