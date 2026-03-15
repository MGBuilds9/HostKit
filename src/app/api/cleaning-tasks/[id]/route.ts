import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cleaningTasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cleaningTaskUpdateSchema } from "@/lib/validators";
import { notifyTaskAssigned, notifyTaskCancelled } from "@/lib/notifications";

// GET /api/cleaning-tasks/[id]
// Returns a single cleaning task with property, stay, and cleaner info.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await db.query.cleaningTasks.findFirst({
    where: eq(cleaningTasks.id, params.id),
    with: {
      property: true,
      stay: true,
      assignedCleaner: true,
    },
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cleaners can only see tasks assigned to them
  if (session.user.role === "cleaner") {
    const cleaner = await db.query.cleaners.findFirst({
      where: (c, { eq: eqFn }) => eqFn(c.userId, session.user.id),
    });
    if (!cleaner || task.assignedCleanerId !== cleaner.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(task);
}

// PATCH /api/cleaning-tasks/[id]
// Updates status, notes, and/or assignedCleanerId on a cleaning task.
// Accessible by admin and manager. Cleaners may update status/notes on
// tasks assigned to them.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  const taskId = params.id;

  // Fetch the existing task first to enforce access and detect changes
  const existing = await db.query.cleaningTasks.findFirst({
    where: eq(cleaningTasks.id, taskId),
    with: { assignedCleaner: true },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cleaners may only update their own assigned tasks and only status/notes
  if (role === "cleaner") {
    const cleaner = await db.query.cleaners.findFirst({
      where: (c, { eq: eqFn }) => eqFn(c.userId, session.user.id),
    });
    if (!cleaner || existing.assignedCleanerId !== cleaner.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Owners have no write access to tasks
  if (role === "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = cleaningTaskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { status, assignedCleanerId, notes } = parsed.data;

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (assignedCleanerId !== undefined) {
    // Empty string means "unassign"
    updates.assignedCleanerId = assignedCleanerId === "" ? null : assignedCleanerId;
  }

  // If completing, stamp completedAt and completedBy
  if (status === "completed") {
    updates.completedAt = new Date();
    updates.completedBy = session.user.name ?? session.user.email ?? "unknown";
  }

  const [updated] = await db
    .update(cleaningTasks)
    .set(updates)
    .where(eq(cleaningTasks.id, taskId))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Side-effects: send notifications for meaningful changes
  const cleanerChanged =
    assignedCleanerId !== undefined &&
    assignedCleanerId !== "" &&
    assignedCleanerId !== existing.assignedCleanerId;

  const wasCancelled =
    status === "cancelled" && existing.status !== "cancelled";

  if (cleanerChanged) {
    try {
      await notifyTaskAssigned(taskId);
    } catch (err) {
      console.error("[cleaning-tasks PATCH] notifyTaskAssigned failed:", err);
    }
  }

  if (wasCancelled) {
    try {
      await notifyTaskCancelled(taskId);
    } catch (err) {
      console.error("[cleaning-tasks PATCH] notifyTaskCancelled failed:", err);
    }
  }

  return NextResponse.json(updated);
}
