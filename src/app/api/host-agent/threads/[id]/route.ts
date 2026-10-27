import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { hostThreads } from "@/db/schema";
import { requireHostAgentApi } from "@/lib/host-agent/auth";
import { replaceThreadLabels } from "@/lib/host-agent/memory";
import { updateHostThreadSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireHostAgentApi();
  if (error) return error;

  const thread = await db.query.hostThreads.findFirst({
    where: eq(hostThreads.id, params.id),
    with: { labels: true, messages: true, drafts: true },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(thread);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireHostAgentApi();
  if (error) return error;

  const parsed = updateHostThreadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.query.hostThreads.findFirst({
    where: eq(hostThreads.id, params.id),
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.title) {
    await db
      .update(hostThreads)
      .set({ title: parsed.data.title, updatedAt: new Date() })
      .where(eq(hostThreads.id, params.id));
  }
  if (parsed.data.labels) {
    await replaceThreadLabels(params.id, parsed.data.labels);
  }

  const thread = await db.query.hostThreads.findFirst({
    where: eq(hostThreads.id, params.id),
    with: { labels: true, messages: true },
  });
  return NextResponse.json(thread);
}
