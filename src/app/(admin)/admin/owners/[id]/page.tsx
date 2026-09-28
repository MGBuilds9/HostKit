import { requireAuth } from "@/lib/auth-guard";
import { db } from "@/db";
import { owners } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { EditOwnerForm } from "./edit-owner-form";

export default async function OwnerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAuth(["admin", "manager"]);

  const owner = await db.query.owners.findFirst({
    where: eq(owners.id, params.id),
    with: { properties: true },
  });

  if (!owner) return notFound();

  return (
    <EditOwnerForm
      owner={{
        id: owner.id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone ?? null,
      }}
      propertyCount={owner.properties.length}
    />
  );
}
