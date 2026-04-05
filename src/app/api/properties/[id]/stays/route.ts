import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { stays, owners } from "@/db/schema";
import { eq, and, gte, lte, lt, gt } from "drizzle-orm";
import { createStaySchema } from "@/lib/validators";
import { generateCleaningTasks } from "@/lib/turnover-generator";

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

// POST /api/properties/[id]/stays — manually create a stay
// Admin/manager only.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const propertyId = params.id;
  const body = await request.json();
  const parsed = createStaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { guestName, startDate, endDate, source, status } = parsed.data;
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }

  // Check for date overlap with existing stays
  // A stay overlaps if: existing.startDate < newEnd AND existing.endDate > newStart
  const overlapping = await db.query.stays.findFirst({
    where: and(
      eq(stays.propertyId, propertyId),
      lt(stays.startDate, end),
      gt(stays.endDate, start)
    ),
  });

  if (overlapping) {
    return NextResponse.json(
      { error: "Date range overlaps with an existing stay" },
      { status: 409 }
    );
  }

  const [inserted] = await db
    .insert(stays)
    .values({
      propertyId,
      source,
      status,
      guestName: guestName ?? null,
      startDate: start,
      endDate: end,
    })
    .returning();

  // Auto-generate cleaning task if property has turnover rules and stay is booked
  if (status === "booked") {
    try {
      await generateCleaningTasks(inserted.id);
    } catch (e) {
      console.error("[stays/POST] generateCleaningTasks failed:", e);
    }
  }

  return NextResponse.json(inserted, { status: 201 });
}
