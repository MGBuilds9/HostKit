import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cleaners, cleaningTasks } from "@/db/schema";
import { eq, count } from "drizzle-orm";

// GET /api/cleaners/[id] — get a single cleaner with task count
// Admin/manager only.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cleaner = await db.query.cleaners.findFirst({
    where: eq(cleaners.id, params.id),
    with: {
      user: { columns: { id: true, name: true, email: true, role: true } },
    },
  });

  if (!cleaner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Task count (total ever assigned, all statuses)
  const [taskCountRow] = await db
    .select({ count: count() })
    .from(cleaningTasks)
    .where(eq(cleaningTasks.assignedCleanerId, params.id));

  return NextResponse.json({ ...cleaner, taskCount: taskCountRow?.count ?? 0 });
}

// PUT /api/cleaners/[id] — update cleaner details
// Admin/manager only.
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  // Allow partial updates of any editable fields
  const { fullName, email, phone, userId, isActive } = body as {
    fullName?: string;
    email?: string;
    phone?: string;
    userId?: string;
    isActive?: boolean;
  };

  if (fullName !== undefined && typeof fullName !== "string") {
    return NextResponse.json({ error: "fullName must be a string" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (fullName !== undefined) updates.fullName = fullName;
  if (email !== undefined) updates.email = email || null;
  if (phone !== undefined) updates.phone = phone || null;
  if (userId !== undefined) updates.userId = userId || null;
  if (isActive !== undefined) updates.isActive = isActive;

  const [updated] = await db
    .update(cleaners)
    .set(updates)
    .where(eq(cleaners.id, params.id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}

// PATCH /api/cleaners/[id] — partial update including notification preferences
// Also accessible by the cleaner themselves (for their own record).
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;

  // Cleaners can only patch their own record (notification prefs)
  if (role === "cleaner") {
    const cleaner = await db.query.cleaners.findFirst({
      where: eq(cleaners.id, params.id),
    });
    if (!cleaner || cleaner.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (body.notificationPreferences !== undefined) {
    updates.notificationPreferences = body.notificationPreferences;
  }
  if (body.fullName !== undefined) updates.fullName = body.fullName;
  if (body.email !== undefined) updates.email = body.email || null;
  if (body.phone !== undefined) updates.phone = body.phone || null;
  if (body.isActive !== undefined) updates.isActive = body.isActive;

  const [updated] = await db
    .update(cleaners)
    .set(updates)
    .where(eq(cleaners.id, params.id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}

// DELETE /api/cleaners/[id] — soft-delete (set isActive = false)
// Admin/manager only.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [updated] = await db
    .update(cleaners)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(cleaners.id, params.id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
