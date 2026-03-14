import { requireAuth } from "@/lib/auth-guard";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { MessageGenerator } from "@/components/admin/message-generator";

export default async function MessagesPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const property = await db.query.properties.findFirst({
    where: eq(properties.id, params.id),
  });
  if (!property) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Messages</h1>
      <p className="text-muted-foreground mb-6">{property.name}</p>
      <MessageGenerator propertyId={params.id} />
    </div>
  );
}
