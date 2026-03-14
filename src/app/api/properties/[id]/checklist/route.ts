import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { checklistTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET — fetch checklist template for property (property-specific first, fallback to global)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Try property-specific template first
  let template = await db.query.checklistTemplates.findFirst({
    where: eq(checklistTemplates.propertyId, params.id),
  });

  // Fall back to global template
  if (!template) {
    template = await db.query.checklistTemplates.findFirst({
      where: eq(checklistTemplates.isGlobal, true),
    });
  }

  if (!template) {
    return NextResponse.json({ error: "No checklist template found" }, { status: 404 });
  }

  return NextResponse.json(template);
}
