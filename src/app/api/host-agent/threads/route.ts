import { NextRequest, NextResponse } from "next/server";
import { desc, ne } from "drizzle-orm";
import { db } from "@/db";
import { hostMessages, hostThreads } from "@/db/schema";
import { requireHostAgentApi } from "@/lib/host-agent/auth";

export async function GET(request: NextRequest) {
  const { error } = await requireHostAgentApi();
  if (error) return error;

  const label = request.nextUrl.searchParams.get("label");

  const threads = await db.query.hostThreads.findMany({
    where: ne(hostThreads.channel, "workspace"),
    orderBy: [desc(hostThreads.updatedAt)],
    with: {
      labels: true,
      messages: {
        orderBy: [hostMessages.occurredAt],
      },
      property: { columns: { id: true, name: true } },
    },
    limit: 100,
  });

  const filtered =
    label && label !== "all"
      ? threads.filter((thread) => thread.labels.some((row) => row.label === label))
      : threads;

  return NextResponse.json(filtered);
}
