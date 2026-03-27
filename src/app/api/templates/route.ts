import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import { asc } from "drizzle-orm";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(1),
  bodyTemplate: z.string().min(1),
  sortOrder: z.number().int().optional().default(0),
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
    .from(messageTemplates)
    .orderBy(asc(messageTemplates.sortOrder));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["admin", "manager"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [template] = await db
    .insert(messageTemplates)
    .values({
      name: parsed.data.name,
      bodyTemplate: parsed.data.bodyTemplate,
      sortOrder: parsed.data.sortOrder,
      isGlobal: parsed.data.isGlobal,
      propertyId: parsed.data.propertyId ?? null,
    })
    .returning();

  return NextResponse.json(template, { status: 201 });
}
