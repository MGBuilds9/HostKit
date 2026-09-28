import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

const roleSchema = z.object({
  role: z.enum(["admin", "owner", "manager", "cleaner"]),
});

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

  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.role !== "admin") {
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
    .set({ role: parsed.data.role, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
