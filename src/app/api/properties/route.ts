import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { properties, owners } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { createPropertySchema } from "@/lib/validators";

// GET /api/properties - list all (filtered for owners)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  // Build base select query with limited fields
  const baseSelect = db.select({
    id: properties.id,
    name: properties.name,
    slug: properties.slug,
    addressCity: properties.addressCity,
    addressState: properties.addressState,
    addressCountry: properties.addressCountry,
    latitude: properties.latitude,
    longitude: properties.longitude,
    cleaningFee: properties.cleaningFee,
    securityDeposit: properties.securityDeposit,
    nightlyRate: properties.nightlyRate,
    weeklyRate: properties.weeklyRate,
    monthlyRate: properties.monthlyRate,
    active: properties.active,
    owner: db.select({
      id: owners.id,
      name: owners.name,
    }).from(owners).where(eq(owners.id, properties.ownerId)).as('owner')
  }).from(properties);

  if (session.user.role === "owner") {
    // Find the owner record associated with this user
    const owner = await db.query.owners.findFirst({
      where: or(eq(owners.userId, session.user.id), eq(owners.email, session.user.email!)),
    });
    if (!owner) {
      return NextResponse.json([]);
    }
    const results = await baseSelect
      .where(eq(properties.ownerId, owner.id))
      .orderBy(desc(properties.createdAt))
      .all();
    return NextResponse.json(results);
  } else {
    // Admin: get all properties
    const results = await baseSelect.orderBy(desc(properties.createdAt)).all();
    return NextResponse.json(results);
  }
}

// POST /api/properties - create new property
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.user.role === "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createPropertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message() }, { status: 400 });
  }

  const [property] = await db.insert(properties).values(parsed.data).returning();
  return NextResponse.json(property, { status: 201 });
}