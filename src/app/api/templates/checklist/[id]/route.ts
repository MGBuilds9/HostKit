import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { checklistTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const checklistItemSchema = z.object({
  label: z.string().min(1),
  type: z.enum(["check", "restock", "deep_clean", "monthly"]),
});

const checklistSectionSchema = z.object({
  title: z.string().min(1),
  items: z.array(checklistItemSchema),
});

const updateChecklistSchema = z.object({
  name: z.string().min(1).optional(),
  sections: z.array(checklistSectionSchema).optional(),
  isGlobal: z.boolean().optional(),
  propertyId: z.string().uuid().nullable().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["admin", "manager"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = params;
  const body = await request.json();
  const parsed = updateChecklistSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [updated] = await db
    .update(checklistTemplates)
    .set(parsed.data)
    .where(eq(checklistTemplates.id, id))
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
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = params;

  const [deleted] = await db
    .delete(checklistTemplates)
    .where(eq(checklistTemplates.id, id))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
