import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { z } from "zod";

// GET /api/settings — returns all app settings as key-value pairs
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.select().from(appSettings);
  const settings: Record<string, string | null> = {};
  for (const row of rows) {
    settings[row.key] = row.value ?? null;
  }
  return NextResponse.json(settings);
}

const putSchema = z.array(
  z.object({
    key: z.string().min(1),
    value: z.string().nullable(),
  })
);

// PUT /api/settings — upsert settings (admin only)
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  for (const { key, value } of parsed.data) {
    await db
      .insert(appSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }

  return NextResponse.json({ ok: true });
}
