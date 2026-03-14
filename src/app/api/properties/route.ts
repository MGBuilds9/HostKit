import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { properties, owners } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createPropertySchema } from "@/lib/validators";

// GET /api/properties — list all (filtered for owners)
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let result;
  if (session.user.role === "owner") {
    const owner = await db.query.owners.findFirst({
      where: eq(owners.userId, session.user.id),
    });
    result = owner
      ? await db.query.properties.findMany({
          where: eq(properties.ownerId, owner.id),
          with: { owner: true },
          orderBy: (p, { desc }) => [desc(p.createdAt)],
        })
      : [];
  } else {
    result = await db.query.properties.findMany({
      with: { owner: true },
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });
  }

  return NextResponse.json(result);
}

// POST /api/properties — create new property
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createPropertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [property] = await db.insert(properties).values(parsed.data).returning();
  return NextResponse.json(property, { status: 201 });
}
