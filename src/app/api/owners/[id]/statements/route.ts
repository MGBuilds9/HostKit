import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { ownerStatements, owners } from "@/db/schema";
import { createStatementSchema } from "@/lib/validators";
import { and, eq } from "drizzle-orm";

interface RouteParams {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin/manager can view any; owner can only view their own
  if (session.user.role === "cleaner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.user.role === "owner") {
    // Verify this owner record belongs to the current user
    const owner = await db.query.owners.findFirst({
      where: and(eq(owners.id, params.id), eq(owners.userId, session.user.id as string)),
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  const month = searchParams.get("month");

  const conditions = [eq(ownerStatements.ownerId, params.id)];
  if (propertyId) conditions.push(eq(ownerStatements.propertyId, propertyId));
  if (month) conditions.push(eq(ownerStatements.month, month));

  const statements = await db
    .select()
    .from(ownerStatements)
    .where(and(...conditions))
    .orderBy(ownerStatements.month);

  return NextResponse.json(statements);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createStatementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [statement] = await db
    .insert(ownerStatements)
    .values({
      ownerId: params.id,
      propertyId: parsed.data.propertyId,
      month: parsed.data.month,
      revenue: parsed.data.revenue,
      expenses: parsed.data.expenses,
      payout: parsed.data.payout,
      status: parsed.data.status,
      notes: parsed.data.notes,
    })
    .returning();

  return NextResponse.json(statement, { status: 201 });
}
