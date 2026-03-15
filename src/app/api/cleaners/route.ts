import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cleaners } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createCleanerSchema } from "@/lib/validators";

// GET /api/cleaners — list all active cleaners
// Admin/manager only.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await db.query.cleaners.findMany({
    where: eq(cleaners.isActive, true),
    with: { user: { columns: { id: true, name: true, email: true, role: true } } },
    orderBy: (c, { asc }) => [asc(c.fullName)],
  });

  return NextResponse.json(result);
}

// POST /api/cleaners — create a new cleaner
// Admin/manager only.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createCleanerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { fullName, email, phone, userId } = parsed.data;

  const [cleaner] = await db
    .insert(cleaners)
    .values({
      fullName,
      email: email || null,
      phone: phone || null,
      userId: userId || null,
    })
    .returning();

  return NextResponse.json(cleaner, { status: 201 });
}
