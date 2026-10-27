import { eq } from "drizzle-orm";
import { db } from "@/db";
import { messageTemplates, properties } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
import { getApproverLockState } from "@/lib/host-agent/auto-send";
import { HostAgentWorkspace } from "./host-agent-workspace";

export default async function HostAgentPage() {
  await requireAuth(["admin", "manager"]);

  const [templates, allProperties] = await Promise.all([
    db.query.messageTemplates.findMany({
      where: eq(messageTemplates.active, true),
      columns: { id: true, name: true },
      orderBy: [messageTemplates.sortOrder],
    }),
    db.query.properties.findMany({
      where: eq(properties.active, true),
      columns: { id: true, name: true },
      orderBy: [properties.name],
    }),
  ]);

  return (
    <HostAgentWorkspace
      lock={getApproverLockState()}
      templates={templates}
      properties={allProperties}
    />
  );
}
