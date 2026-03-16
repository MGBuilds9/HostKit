import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { properties, owners } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { createPropertySchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const property = await db.query.properties.findFirst({
    where: eq(properties.id, params.id),
    with: { owner: true },
  });

  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Owner-scoped access: owners can only view their own properties
  if (session.user.role === "owner") {
    const owner = await db.query.owners.findFirst({
      where: or(
        eq(owners.userId, session.user.id),
        eq(owners.email, session.user.email!)
      ),
    });
    if (!owner || property.ownerId !== owner.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(property);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Owners can only update their own properties
  if (session.user.role === "owner") {
    const owner = await db.query.owners.findFirst({
      where: or(
        eq(owners.userId, session.user.id),
        eq(owners.email, session.user.email!)
      ),
    });
    const property = await db.query.properties.findFirst({
      where: eq(properties.id, params.id),
      columns: { ownerId: true },
    });
    if (!owner || !property || property.ownerId !== owner.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json();
  const parsed = createPropertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db.update(properties)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(properties.id, params.id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.delete(properties).where(eq(properties.id, params.id));
  return NextResponse.json({ ok: true });
}
