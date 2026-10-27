import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { hostMessages, hostThreads } from "@/db/schema";
import { requireHostAgentApi } from "@/lib/host-agent/auth";
import { applyDefaultLabels, parseArchiveInput } from "@/lib/host-agent/ingest";
import { replaceThreadLabels } from "@/lib/host-agent/memory";
import { ingestArchiveSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";

const ingestLimiter = rateLimit({ windowMs: 60_000, maxRequests: 20 });

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const limit = ingestLimiter.check(ip);
  if (!limit.success) {
    const retryAfter = Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many requests", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const { session, error } = await requireHostAgentApi();
  if (error || !session) return error;

  const parsed = ingestArchiveSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const threads = applyDefaultLabels(
    parseArchiveInput(parsed.data.text),
    parsed.data.labels ?? []
  );
  if (threads.length === 0) {
    return NextResponse.json(
      { error: "No threads found. Paste JSON or Guest:/Host: lines." },
      { status: 400 }
    );
  }

  const created = [];
  for (const thread of threads) {
    const [row] = await db
      .insert(hostThreads)
      .values({
        source: "archive",
        title: thread.title,
        guestName: thread.guestName ?? null,
        channel: parsed.data.channel ?? thread.channel ?? "paste",
        propertyId: parsed.data.propertyId ?? thread.propertyId ?? null,
        importedByUserId: session.user.id,
      })
      .returning();

    if (thread.labels && thread.labels.length > 0) {
      await replaceThreadLabels(row.id, thread.labels);
    }

    if (thread.messages.length > 0) {
      await db.insert(hostMessages).values(
        thread.messages.map((message) => ({
          threadId: row.id,
          role: message.role,
          body: message.body,
          occurredAt: message.occurredAt ? new Date(message.occurredAt) : new Date(),
          createdByUserId: session.user.id,
        }))
      );
    }
    created.push(row);
  }

  return NextResponse.json({ imported: created.length, threads: created }, { status: 201 });
}
