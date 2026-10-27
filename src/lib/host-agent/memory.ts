import { desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  hostDraftEvents,
  hostMessages,
  hostThreadLabels,
  hostThreads,
} from "@/db/schema";
import { labelsAfterOutcome, outcomeToLabel, type DraftFeedbackAction } from "./feedback";
import {
  retrieveExamples,
  type ExampleLabel,
  type RetrievableExample,
  type RetrievedExample,
} from "./retrieve";

const WORKSPACE_CHANNEL = "workspace";

export async function getOrCreateWorkspaceThread(userId: string) {
  const existing = await db.query.hostThreads.findFirst({
    where: eq(hostThreads.channel, WORKSPACE_CHANNEL),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(hostThreads)
    .values({
      source: "live",
      title: "Host agent workspace",
      channel: WORKSPACE_CHANNEL,
      importedByUserId: userId,
    })
    .returning();
  return created;
}

export async function loadRetrievableExamples(): Promise<RetrievableExample[]> {
  const threads = await db.query.hostThreads.findMany({
    where: ne(hostThreads.channel, WORKSPACE_CHANNEL),
    with: {
      labels: true,
      messages: {
        orderBy: [hostMessages.occurredAt],
      },
      drafts: {
        with: {
          events: true,
        },
      },
    },
    orderBy: [desc(hostThreads.updatedAt)],
    limit: 80,
  });

  return threads.map((thread) => ({
    threadId: thread.id,
    title: thread.title,
    guestName: thread.guestName,
    labels: thread.labels.map((row) => row.label) as ExampleLabel[],
    messages: thread.messages.map((m) => ({ role: m.role, body: m.body })),
    outcomes: thread.drafts.flatMap((d) =>
      d.events
        .map((e) => e.action)
        .filter((a): a is "approved" | "rejected" | "edited" | "sent" =>
          a === "approved" || a === "rejected" || a === "edited" || a === "sent"
        )
    ),
  }));
}

export async function retrieveForQuery(query: string, limit = 5): Promise<RetrievedExample[]> {
  const examples = await loadRetrievableExamples();
  return retrieveExamples(query, examples, limit);
}

export async function recordDraftEvent(opts: {
  draftId: string;
  action: DraftFeedbackAction | "created";
  actorUserId: string;
  note?: string | null;
  bodySnapshot?: string | null;
  threadId?: string | null;
}) {
  await db.insert(hostDraftEvents).values({
    draftId: opts.draftId,
    action: opts.action,
    note: opts.note ?? null,
    bodySnapshot: opts.bodySnapshot ?? null,
    actorUserId: opts.actorUserId,
  });

  if (opts.action === "created" || !opts.threadId) return;

  const label = outcomeToLabel(opts.action);
  if (!label) return;

  const existing = await db
    .select()
    .from(hostThreadLabels)
    .where(eq(hostThreadLabels.threadId, opts.threadId));
  const next = labelsAfterOutcome(
    existing.map((row) => row.label) as ExampleLabel[],
    opts.action
  );

  await db.delete(hostThreadLabels).where(eq(hostThreadLabels.threadId, opts.threadId));
  if (next.length > 0) {
    await db.insert(hostThreadLabels).values(
      next.map((value) => ({ threadId: opts.threadId!, label: value }))
    );
  }
}

export async function replaceThreadLabels(threadId: string, labels: ExampleLabel[]) {
  await db.delete(hostThreadLabels).where(eq(hostThreadLabels.threadId, threadId));
  const unique = Array.from(new Set(labels));
  if (unique.length === 0) return;
  await db.insert(hostThreadLabels).values(
    unique.map((label) => ({ threadId, label }))
  );
}
