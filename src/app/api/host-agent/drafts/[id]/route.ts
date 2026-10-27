import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { hostDrafts } from "@/db/schema";
import { requireHostAgentApi } from "@/lib/host-agent/auth";
import { canManualSend, dryRunSend } from "@/lib/host-agent/auto-send";
import { recordDraftEvent } from "@/lib/host-agent/memory";
import { updateHostDraftSchema } from "@/lib/validators";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireHostAgentApi();
  if (error || !session) return error;

  const parsed = updateHostDraftSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.query.hostDrafts.findFirst({
    where: eq(hostDrafts.id, params.id),
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status === "sent") {
    return NextResponse.json({ error: "Sent drafts cannot be changed" }, { status: 409 });
  }

  const now = new Date();
  const { action, body, note } = parsed.data;

  if (action === "edit") {
    if (!body?.trim()) {
      return NextResponse.json({ error: "Edited body is required" }, { status: 400 });
    }
    if (existing.status === "rejected") {
      return NextResponse.json({ error: "Rejected drafts cannot be edited" }, { status: 409 });
    }
    const [updated] = await db
      .update(hostDrafts)
      .set({
        body,
        originalBody: existing.originalBody ?? existing.body,
        feedbackNote: note ?? existing.feedbackNote,
        status: existing.status === "approved" ? "approved" : "pending",
        updatedAt: now,
      })
      .where(eq(hostDrafts.id, existing.id))
      .returning();
    await recordDraftEvent({
      draftId: existing.id,
      action: "edited",
      actorUserId: session.user.id,
      note,
      bodySnapshot: body,
      threadId: existing.threadId,
    });
    return NextResponse.json(updated);
  }

  if (action === "approve") {
    if (existing.status !== "pending") {
      return NextResponse.json({ error: "Only pending drafts can be approved" }, { status: 409 });
    }
    const [updated] = await db
      .update(hostDrafts)
      .set({
        status: "approved",
        reviewedByUserId: session.user.id,
        reviewedAt: now,
        feedbackNote: note ?? existing.feedbackNote,
        updatedAt: now,
      })
      .where(eq(hostDrafts.id, existing.id))
      .returning();
    await recordDraftEvent({
      draftId: existing.id,
      action: "approved",
      actorUserId: session.user.id,
      note,
      bodySnapshot: updated.body,
      threadId: existing.threadId,
    });
    return NextResponse.json(updated);
  }

  if (action === "reject") {
    if (existing.status !== "pending" && existing.status !== "approved") {
      return NextResponse.json({ error: "Only pending or approved drafts can be rejected" }, { status: 409 });
    }
    const [updated] = await db
      .update(hostDrafts)
      .set({
        status: "rejected",
        reviewedByUserId: session.user.id,
        reviewedAt: now,
        feedbackNote: note ?? existing.feedbackNote,
        updatedAt: now,
      })
      .where(eq(hostDrafts.id, existing.id))
      .returning();
    await recordDraftEvent({
      draftId: existing.id,
      action: "rejected",
      actorUserId: session.user.id,
      note,
      bodySnapshot: updated.body,
      threadId: existing.threadId,
    });
    return NextResponse.json(updated);
  }

  // send — dry-run stub. Gated: approved, or a safe template.
  if (!canManualSend(existing)) {
    return NextResponse.json(
      { error: "Send is gated. Approve the draft first (safe templates may send without a second approve)." },
      { status: 409 }
    );
  }
  const result = dryRunSend();
  const [updated] = await db
    .update(hostDrafts)
    .set({
      status: "sent",
      sentAt: result.sentAt,
      sendNote: result.note,
      reviewedByUserId: existing.reviewedByUserId ?? session.user.id,
      reviewedAt: existing.reviewedAt ?? now,
      updatedAt: now,
    })
    .where(eq(hostDrafts.id, existing.id))
    .returning();
  await recordDraftEvent({
    draftId: existing.id,
    action: "sent",
    actorUserId: session.user.id,
    note: result.note,
    bodySnapshot: updated.body,
    threadId: existing.threadId,
  });
  return NextResponse.json(updated);
}
