import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { hostDrafts, hostMessages } from "@/db/schema";
import { requireHostAgentApi } from "@/lib/host-agent/auth";
import { callHostAgent } from "@/lib/host-agent/client";
import {
  getOrCreateWorkspaceThread,
  recordDraftEvent,
  retrieveForQuery,
} from "@/lib/host-agent/memory";
import { appendHostChatSchema } from "@/lib/validators";

export async function GET() {
  const { session, error } = await requireHostAgentApi();
  if (error || !session) return error;

  const workspace = await getOrCreateWorkspaceThread(session.user.id);
  const messages = await db.query.hostMessages.findMany({
    where: eq(hostMessages.threadId, workspace.id),
    orderBy: [desc(hostMessages.occurredAt)],
    limit: 200,
  });
  return NextResponse.json({ threadId: workspace.id, messages: messages.reverse() });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireHostAgentApi();
  if (error || !session) return error;

  const parsed = appendHostChatSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const workspace = await getOrCreateWorkspaceThread(session.user.id);
  const selectedDraft = parsed.data.draftId
    ? await db.query.hostDrafts.findFirst({ where: eq(hostDrafts.id, parsed.data.draftId) })
    : null;

  const [userMessage] = await db
    .insert(hostMessages)
    .values({
      threadId: workspace.id,
      draftId: parsed.data.draftId ?? null,
      role: "user",
      body: parsed.data.body,
      createdByUserId: session.user.id,
    })
    .returning();

  const queryParts = [
    parsed.data.body,
    selectedDraft?.title ?? "",
    selectedDraft?.body ?? "",
  ]
    .filter(Boolean)
    .join("\n");
  const examples = await retrieveForQuery(queryParts);

  const agent = await callHostAgent({
    message: parsed.data.body,
    examples,
    selectedDraft: selectedDraft
      ? {
          id: selectedDraft.id,
          title: selectedDraft.title,
          body: selectedDraft.body,
          status: selectedDraft.status,
        }
      : null,
  });

  const [assistantMessage] = await db
    .insert(hostMessages)
    .values({
      threadId: workspace.id,
      draftId: parsed.data.draftId ?? null,
      role: "assistant",
      body: agent.reply,
      createdByUserId: session.user.id,
    })
    .returning();

  let draft = selectedDraft ?? null;
  if (agent.draft) {
    const [created] = await db
      .insert(hostDrafts)
      .values({
        title: agent.draft.title,
        body: agent.draft.body,
        originalBody: agent.draft.body,
        threadId: parsed.data.threadId ?? selectedDraft?.threadId ?? null,
        propertyId: selectedDraft?.propertyId ?? null,
        isSafeTemplate: false,
        source: parsed.data.threadId ? "thread" : "chat",
        status: "pending",
        retrievedThreadIds: examples.map((ex) => ex.threadId),
        createdByUserId: session.user.id,
      })
      .returning();
    draft = created;
    await recordDraftEvent({
      draftId: created.id,
      action: "created",
      actorUserId: session.user.id,
      bodySnapshot: created.body,
      threadId: created.threadId,
    });
  }

  return NextResponse.json({
    userMessage,
    assistantMessage,
    draft,
    examples,
    agentSource: agent.source,
  });
}
