import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { properties, messageTemplates } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { buildVariablesFromProperty, renderTemplate } from "@/lib/template-engine";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const property = await db.query.properties.findFirst({
    where: eq(properties.id, params.id),
    with: { owner: true },
  });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get templates: property-specific + global
  const templates = await db.query.messageTemplates.findMany({
    where: or(
      eq(messageTemplates.propertyId, params.id),
      eq(messageTemplates.isGlobal, true)
    ),
    orderBy: (t, { asc }) => [asc(t.sortOrder)],
  });

  const guestName = request.nextUrl.searchParams.get("guestName") ?? "";
  const checkinDate = request.nextUrl.searchParams.get("checkinDate") ?? "";
  const checkoutDate = request.nextUrl.searchParams.get("checkoutDate") ?? "";

  const variables = buildVariablesFromProperty(
    property as unknown as Record<string, unknown>,
    property.owner.name,
    guestName,
    checkinDate,
    checkoutDate
  );

  const rendered = templates.map((t) => ({
    id: t.id,
    name: t.name,
    triggerDescription: t.triggerDescription,
    body: renderTemplate(t.bodyTemplate, variables),
    isGlobal: t.isGlobal,
  }));

  return NextResponse.json(rendered);
}
