import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { owners } from "@/db/schema";
import { createOwnerSchema } from "@/lib/validators";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await db.query.owners.findMany({ with: { properties: true } });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const parsed = createOwnerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [owner] = await db.insert(owners).values({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    userId: parsed.data.userId,
  }).returning();
  return NextResponse.json(owner, { status: 201 });
}
