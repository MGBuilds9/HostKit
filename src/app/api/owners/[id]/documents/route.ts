import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { ownerDocuments, owners } from "@/db/schema";
import { createDocumentSchema } from "@/lib/validators";
import { and, eq } from "drizzle-orm";

interface RouteParams {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin/manager can view any; owner can only view their own
  if (session.user.role === "cleaner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.user.role === "owner") {
    const owner = await db.query.owners.findFirst({
      where: and(eq(owners.id, params.id), eq(owners.userId, session.user.id as string)),
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const documents = await db
    .select()
    .from(ownerDocuments)
    .where(eq(ownerDocuments.ownerId, params.id))
    .orderBy(ownerDocuments.uploadedAt);

  return NextResponse.json(documents);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [document] = await db
    .insert(ownerDocuments)
    .values({
      ownerId: params.id,
      type: parsed.data.type,
      name: parsed.data.name,
      fileUrl: parsed.data.fileUrl,
    })
    .returning();

  return NextResponse.json(document, { status: 201 });
}
