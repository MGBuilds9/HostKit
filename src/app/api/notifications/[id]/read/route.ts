import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// POST /api/notifications/[id]/read
// Marks a notification as read. Only the owning user may mark their own
// notifications.
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only update the row if it belongs to the current user — this prevents
  // one user from marking another user's notifications as read.
  const [updated] = await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.id, params.id),
        eq(notifications.userId, session.user.id)
      )
    )
    .returning();

  if (!updated) {
    // Either the notification doesn't exist or it belongs to a different user
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
