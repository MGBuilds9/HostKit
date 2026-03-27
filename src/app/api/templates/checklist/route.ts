import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { checklistTemplates } from "@/db/schema";
import { asc } from "drizzle-orm";
import { z } from "zod";

const checklistItemSchema = z.object({
  label: z.string().min(1),
  type: z.enum(["check", "restock", "deep_clean", "monthly"]),
});

const checklistSectionSchema = z.object({
  title: z.string().min(1),
  items: z.array(checklistItemSchema),
});

const createChecklistSchema = z.object({
  name: z.string().min(1),
  sections: z.array(checklistSectionSchema),
  isGlobal: z.boolean().optional().default(true),
  propertyId: z.string().uuid().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["admin", "manager"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await db
    .select()
    .from(checklistTemplates)
    .orderBy(asc(checklistTemplates.createdAt));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["admin", "manager"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createChecklistSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [template] = await db
    .insert(checklistTemplates)
    .values({
      name: parsed.data.name,
      sections: parsed.data.sections,
      isGlobal: parsed.data.isGlobal,
      propertyId: parsed.data.propertyId ?? null,
    })
    .returning();

  return NextResponse.json(template, { status: 201 });
}
