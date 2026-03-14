import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { turnovers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET — list turnovers for property
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await db.query.turnovers.findMany({
    where: eq(turnovers.propertyId, params.id),
    orderBy: [desc(turnovers.completedAt)],
  });

  return NextResponse.json(result);
}

// POST — complete a turnover
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();

  const [turnover] = await db.insert(turnovers).values({
    propertyId: params.id,
    completedBy: session.user.name ?? session.user.email ?? "Unknown",
    checklistData: body.checklistData,
    notes: body.notes,
    nextGuestCheckin: body.nextGuestCheckin ? new Date(body.nextGuestCheckin) : null,
  }).returning();

  return NextResponse.json(turnover, { status: 201 });
}
