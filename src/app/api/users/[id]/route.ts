import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cleaners, notifications, owners, users } from "@/db/schema";
import { userUpdateSchema } from "@/lib/validators";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;

  const body = await request.json();
  const parsed = userUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.role !== undefined && id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 400 }
    );
  }

  if (parsed.data.isActive === false && id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot deactivate your own account" },
      { status: 400 }
    );
  }

  const removesAdmin =
    parsed.data.role !== undefined
      ? parsed.data.role !== "admin"
      : parsed.data.isActive === false;

  if (removesAdmin) {
    const [target] = await db.select().from(users).where(eq(users.id, id));
    if (target && target.role === "admin" && target.isActive) {
      const others = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, "admin"),
            eq(users.isActive, true),
            ne(users.id, id)
          )
        );
      if (others.length === 0) {
        return NextResponse.json(
          { error: "Cannot remove the last admin" },
          { status: 409 }
        );
      }
    }
  }

  const [updated] = await db
    .update(users)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;

  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  const [target] = await db.select().from(users).where(eq(users.id, id));
  if (target && target.role === "admin" && target.isActive) {
    const others = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, "admin"),
          eq(users.isActive, true),
          ne(users.id, id)
        )
      );
    if (others.length === 0) {
      return NextResponse.json(
        { error: "Cannot remove the last admin" },
        { status: 409 }
      );
    }
  }

  const linkedOwners = await db
    .select()
    .from(owners)
    .where(eq(owners.userId, id));
  if (linkedOwners.length > 0) {
    return NextResponse.json(
      { error: "User has linked owner records; reassign first" },
      { status: 409 }
    );
  }

  const linkedCleaners = await db
    .select()
    .from(cleaners)
    .where(eq(cleaners.userId, id));
  if (linkedCleaners.length > 0) {
    return NextResponse.json(
      { error: "User has linked cleaner records; reassign first" },
      { status: 409 }
    );
  }

  const linkedNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, id));
  if (linkedNotifications.length > 0) {
    return NextResponse.json(
      { error: "User has linked notification records; clear them first" },
      { status: 409 }
    );
  }

  const [deleted] = await db
    .delete(users)
    .where(eq(users.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: deleted.id });
}
