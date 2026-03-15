import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cleaningTasks, owners } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

// GET /api/properties/[id]/cleaning-tasks
// Query params:
//   status  — optional, one of: pending|offered|accepted|in_progress|completed|cancelled
//   from    — optional ISO date string
//   to      — optional ISO date string
//
// Returns cleaning tasks for the property, including assigned cleaner and stay info.
// Admin/manager: all tasks. Owners: only their properties. Cleaners: forbidden here
// (they use /calendar or /cleaning-tasks/[id]).
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  const propertyId = params.id;

  // Cleaners do not access property-scoped task lists
  if (role === "cleaner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Owners may only view tasks for their own properties
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

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const validStatuses = ["pending", "offered", "accepted", "in_progress", "completed", "cancelled"] as const;
  type TaskStatus = typeof validStatuses[number];

  if (statusParam && !validStatuses.includes(statusParam as TaskStatus)) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }

  const conditions = [eq(cleaningTasks.propertyId, propertyId)];

  if (statusParam) {
    conditions.push(eq(cleaningTasks.status, statusParam as TaskStatus));
  }

  if (fromParam) {
    const from = new Date(fromParam);
    if (isNaN(from.getTime())) return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
    conditions.push(gte(cleaningTasks.scheduledStart, from));
  }

  if (toParam) {
    const to = new Date(toParam);
    if (isNaN(to.getTime())) return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
    conditions.push(lte(cleaningTasks.scheduledStart, to));
  }

  const result = await db.query.cleaningTasks.findMany({
    where: and(...conditions),
    with: {
      assignedCleaner: true,
      stay: true,
    },
    orderBy: (ct, { asc }) => [asc(ct.scheduledStart)],
  });

  return NextResponse.json(result);
}
