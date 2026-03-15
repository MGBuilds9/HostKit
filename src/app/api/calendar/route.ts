import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { stays, cleaningTasks, owners } from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { calendarQuerySchema } from "@/lib/validators";

// GET /api/calendar?from=<ISO>&to=<ISO>&propertyId=<uuid>
// Returns an array of { property, stays: [...staysWithTasks] }.
//
// Role scoping:
//   admin/manager  — all properties
//   owner          — only their properties
//   cleaner        — only properties where they have assigned tasks in range
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rawQuery = {
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    propertyId: searchParams.get("propertyId") ?? undefined,
  };

  const parsed = calendarQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { from, to, propertyId: filterPropertyId } = parsed.data;
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const { role } = session.user;

  // ── Resolve which property IDs this user may see ──────────────────────────

  let allowedPropertyIds: string[] | null = null; // null = all

  if (role === "owner") {
    const owner = await db.query.owners.findFirst({
      where: eq(owners.userId, session.user.id),
      with: { properties: { columns: { id: true } } },
    });
    allowedPropertyIds = owner?.properties.map((p) => p.id) ?? [];
  } else if (role === "cleaner") {
    // Find the cleaner record
    const cleaner = await db.query.cleaners.findFirst({
      where: (c, { eq: eqFn }) => eqFn(c.userId, session.user.id),
    });

    if (!cleaner) {
      return NextResponse.json([], { status: 200 });
    }

    // Find unique propertyIds from tasks assigned to this cleaner in the range
    const assignedTasks = await db
      .select({ propertyId: cleaningTasks.propertyId })
      .from(cleaningTasks)
      .where(
        and(
          eq(cleaningTasks.assignedCleanerId, cleaner.id),
          gte(cleaningTasks.scheduledStart, fromDate),
          lte(cleaningTasks.scheduledStart, toDate)
        )
      );

    const uniqueIds = Array.from(new Set(assignedTasks.map((t) => t.propertyId)));
    allowedPropertyIds = uniqueIds;
  }

  // Apply optional single-property filter on top of role scope
  if (filterPropertyId) {
    if (allowedPropertyIds === null) {
      allowedPropertyIds = [filterPropertyId];
    } else if (allowedPropertyIds.includes(filterPropertyId)) {
      allowedPropertyIds = [filterPropertyId];
    } else {
      // Requested a property this user can't see
      return NextResponse.json([], { status: 200 });
    }
  }

  if (allowedPropertyIds !== null && allowedPropertyIds.length === 0) {
    return NextResponse.json([], { status: 200 });
  }

  // ── Load properties ────────────────────────────────────────────────────────

  const propertyRows = await db.query.properties.findMany({
    where: allowedPropertyIds !== null
      ? (p, { inArray: inArrayFn }) => inArrayFn(p.id, allowedPropertyIds!)
      : undefined,
    with: { owner: true },
    orderBy: (p, { asc }) => [asc(p.name)],
  });

  // ── Load stays with tasks for each property in range ───────────────────────

  const propertyIds = propertyRows.map((p) => p.id);

  if (propertyIds.length === 0) {
    return NextResponse.json([], { status: 200 });
  }

  // Fetch all stays overlapping the range across all allowed properties
  const stayRows = await db.query.stays.findMany({
    where: and(
      inArray(stays.propertyId, propertyIds),
      lte(stays.startDate, toDate),
      gte(stays.endDate, fromDate)
    ),
    with: {
      cleaningTasks: {
        with: { assignedCleaner: true },
        orderBy: (ct, { asc }) => [asc(ct.scheduledStart)],
      },
    },
    orderBy: (s, { asc }) => [asc(s.startDate)],
  });

  // Group stays by propertyId
  const staysByPropertyId = new Map<string, typeof stayRows>();
  for (const stay of stayRows) {
    const list = staysByPropertyId.get(stay.propertyId) ?? [];
    list.push(stay);
    staysByPropertyId.set(stay.propertyId, list);
  }

  const result = propertyRows.map((property) => ({
    property,
    stays: staysByPropertyId.get(property.id) ?? [],
  }));

  return NextResponse.json(result);
}
