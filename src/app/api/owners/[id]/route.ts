import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { owners, properties } from "@/db/schema";
import { createOwnerSchema } from "@/lib/validators";
import { eq, count } from "drizzle-orm";

interface RouteParams {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const owner = await db.query.owners.findFirst({
    where: eq(owners.id, params.id),
    with: {
      properties: true,
      statements: { orderBy: (s, { desc }) => [desc(s.month)] },
    },
  });

  if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(owner);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createOwnerSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(owners)
    .set(parsed.data)
    .where(eq(owners.id, params.id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cascade check — only delete if no properties linked
  const [{ value: propertyCount }] = await db
    .select({ value: count() })
    .from(properties)
    .where(eq(properties.ownerId, params.id));

  if (propertyCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete owner with linked properties" },
      { status: 409 }
    );
  }

  const [deleted] = await db
    .delete(owners)
    .where(eq(owners.id, params.id))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
