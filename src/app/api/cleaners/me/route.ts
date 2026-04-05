import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cleaners } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/cleaners/me — returns the cleaner record for the current session user
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cleaner = await db.query.cleaners.findFirst({
    where: eq(cleaners.userId, session.user.id),
    columns: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      isActive: true,
      notificationPreferences: true,
    },
  });

  if (!cleaner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(cleaner);
}
