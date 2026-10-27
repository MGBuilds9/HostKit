import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { hostDrafts, messageTemplates } from "@/db/schema";
import { requireHostAgentApi } from "@/lib/host-agent/auth";
import { autoSendIfAllowed } from "@/lib/host-agent/auto-send";
import { recordDraftEvent } from "@/lib/host-agent/memory";
import { createHostDraftSchema } from "@/lib/validators";

export async function GET() {
  const { error } = await requireHostAgentApi();
  if (error) return error;

  const drafts = await db.query.hostDrafts.findMany({
    orderBy: [desc(hostDrafts.createdAt)],
    limit: 100,
    with: {
      thread: { columns: { id: true, title: true, guestName: true } },
      events: true,
    },
  });
  return NextResponse.json(drafts);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireHostAgentApi();
  if (error || !session) return error;

  const parsed = createHostDraftSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let title = parsed.data.title ?? "Guest reply draft";
  let body = parsed.data.body ?? "";
  let isSafeTemplate = parsed.data.isSafeTemplate === true;
  let status: "pending" | "approved" = "pending";
  const source = parsed.data.source ?? (parsed.data.templateId ? "template" : "chat");

  if (parsed.data.templateId) {
    const template = await db.query.messageTemplates.findFirst({
      where: eq(messageTemplates.id, parsed.data.templateId),
    });
    if (!template || template.active === false) {
      return NextResponse.json({ error: "Template not found or inactive" }, { status: 400 });
    }
    title = parsed.data.title ?? template.name;
    body = parsed.data.body ?? template.bodyTemplate;
    isSafeTemplate = true;
    status = "approved";
  }

  if (!body.trim()) {
    return NextResponse.json({ error: "Draft body is required" }, { status: 400 });
  }

  const [draft] = await db
    .insert(hostDrafts)
    .values({
      title,
      body,
      originalBody: body,
      threadId: parsed.data.threadId ?? null,
      propertyId: parsed.data.propertyId ?? null,
      templateId: parsed.data.templateId ?? null,
      isSafeTemplate,
      source,
      status,
      retrievedThreadIds: parsed.data.retrievedThreadIds ?? [],
      createdByUserId: session.user.id,
      reviewedByUserId: isSafeTemplate ? session.user.id : null,
      reviewedAt: isSafeTemplate ? new Date() : null,
    })
    .returning();

  await recordDraftEvent({
    draftId: draft.id,
    action: "created",
    actorUserId: session.user.id,
    bodySnapshot: body,
    threadId: draft.threadId,
  });

  const auto = autoSendIfAllowed(draft);
  if (auto) {
    const [sent] = await db
      .update(hostDrafts)
      .set({
        status: "sent",
        sentAt: auto.sentAt,
        sendNote: auto.note,
        updatedAt: new Date(),
      })
      .where(eq(hostDrafts.id, draft.id))
      .returning();
    await recordDraftEvent({
      draftId: draft.id,
      action: "sent",
      actorUserId: session.user.id,
      note: auto.note,
      bodySnapshot: sent.body,
      threadId: sent.threadId,
    });
    return NextResponse.json(sent, { status: 201 });
  }

  return NextResponse.json(draft, { status: 201 });
}
