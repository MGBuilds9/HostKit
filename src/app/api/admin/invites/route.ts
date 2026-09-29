import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invites, owners, properties } from "@/db/schema";
import { eq, desc, or } from "drizzle-orm";
import { createInvite } from "@/lib/invites";
import { createInviteSchema } from "@/lib/validators";
import { sendInviteEmail } from "@/lib/notifications";

// GET /api/admin/invites?propertyId=<uuid>
// List invites, optionally filtered by property. Admin only.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("propertyId");
  const ownerId = searchParams.get("ownerId");

  const where =
    propertyId && ownerId
      ? or(eq(invites.propertyId, propertyId), eq(invites.ownerId, ownerId))
      : propertyId
        ? eq(invites.propertyId, propertyId)
        : ownerId
          ? eq(invites.ownerId, ownerId)
          : undefined;

  const rows = await db.query.invites.findMany({
    where,
    orderBy: [desc(invites.createdAt)],
  });

  // The token is a bearer secret. Create/resend deliver it by email.
  // The list never returns it.
  return NextResponse.json(
    rows.map((row) => {
      const { token, ...invite } = row;
      return token ? invite : invite;
    })
  );
}

// POST /api/admin/invites
// Create a new invite. Admin only.
// For intendedRole='owner': provide ownerId OR ownerName (a new owners row is created).
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, intendedRole, propertyId, ownerId, ownerName, expiresInDays } = parsed.data;
  let resolvedOwnerId = ownerId ?? null;
  const normalizedEmail = email.trim().toLowerCase();

  // For owner invites: reuse an existing owner by email, or validate a supplied
  // ownerId exists, or create a new owner row when only a name was supplied.
  if (intendedRole === "owner") {
    if (resolvedOwnerId) {
      // M3: the supplied ownerId must reference an existing owner row.
      const existing = await db.query.owners.findFirst({
        where: eq(owners.id, resolvedOwnerId),
        columns: { id: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Owner not found" }, { status: 400 });
      }
    } else if (ownerName) {
      // H5: owners has no unique(email); reuse by email to avoid duplicate owners.
      const existingByEmail = await db.query.owners.findFirst({
        where: eq(owners.email, normalizedEmail),
      });
      if (existingByEmail) {
        resolvedOwnerId = existingByEmail.id;
      } else {
        const [newOwner] = await db
          .insert(owners)
          .values({ name: ownerName, email: normalizedEmail })
          .returning();
        resolvedOwnerId = newOwner.id;
      }
    }
  }

  // Fetch property name for the email (optional).
  let propertyName: string | undefined;
  if (propertyId) {
    const prop = await db.query.properties.findFirst({
      where: eq(properties.id, propertyId),
      columns: { name: true },
    });
    propertyName = prop?.name;
  }

  const { url } = await createInvite({
    email,
    intendedRole,
    propertyId: propertyId ?? null,
    ownerId: resolvedOwnerId,
    invitedByUserId: session.user.id,
    expiresInDays,
  });

  await sendInviteEmail(email, url, intendedRole, propertyName);

  return NextResponse.json({ url }, { status: 201 });
}
