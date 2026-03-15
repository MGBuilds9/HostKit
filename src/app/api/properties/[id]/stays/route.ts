import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { stays, owners } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

// GET /api/properties/[id]/stays?from=<ISO>&to=<ISO>
// Returns all stays for a property within the given date range, including
// their associated cleaning tasks.
// Owners are restricted to properties they own.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  const propertyId = params.id;

  // Owners may only view stays for their own properties
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

  // Cleaners have no direct access to stays (they use /calendar or /cleaning-tasks)
  if (role === "cleaner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  // Build date filter conditions
  const conditions = [eq(stays.propertyId, propertyId)];

  if (fromParam && toParam) {
    const from = new Date(fromParam);
    const to = new Date(toParam);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    // Include stays that overlap the range:
    //   startDate <= to AND endDate >= from
    conditions.push(lte(stays.startDate, to));
    conditions.push(gte(stays.endDate, from));
  } else if (fromParam) {
    const from = new Date(fromParam);
    if (isNaN(from.getTime())) {
      return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
    }
    conditions.push(gte(stays.endDate, from));
  } else if (toParam) {
    const to = new Date(toParam);
    if (isNaN(to.getTime())) {
      return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
    }
    conditions.push(lte(stays.startDate, to));
  }

  const result = await db.query.stays.findMany({
    where: and(...conditions),
    with: {
      cleaningTasks: {
        with: {
          assignedCleaner: true,
        },
        orderBy: (ct, { asc }) => [asc(ct.scheduledStart)],
      },
    },
    orderBy: (s, { asc }) => [asc(s.startDate)],
  });

  return NextResponse.json(result);
}
