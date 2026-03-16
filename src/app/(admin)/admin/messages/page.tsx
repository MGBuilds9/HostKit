import { requireAuth } from "@/lib/auth-guard";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MessagesPageClient } from "./messages-client";

export default async function AllMessagesPage() {
  await requireAuth();

  const allProperties = await db.query.properties.findMany({
    where: eq(properties.active, true),
    columns: { id: true, name: true },
    orderBy: [properties.name],
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Messages</h1>
      <p className="text-muted-foreground mb-6">
        Generate guest messages for any property.
      </p>
      <MessagesPageClient properties={allProperties} />
    </div>
  );
}
