import { db } from "@/db";
import { properties, owners } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-guard";
import { PropertyForm } from "@/components/admin/property-form";

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
  const session = await requireAuth(["admin", "manager", "owner"]);

  const property = await db.query.properties.findFirst({
    where: eq(properties.id, params.id),
  });
  if (!property) notFound();

  // Owners can only edit their own properties (match by userId or email)
  if (session.user.role === "owner") {
    const owner = await db.query.owners.findFirst({
      where: or(
        eq(owners.userId, session.user.id),
        eq(owners.email, session.user.email!)
      ),
    });
    if (!owner || property.ownerId !== owner.id) notFound();
  }

  const ownerList = await db.select({ id: owners.id, name: owners.name }).from(owners);

  return (
    <div className="max-w-2xl pb-20 md:pb-0">
      <h1 className="text-2xl font-semibold mb-6">Edit {property.name}</h1>
      <PropertyForm
        owners={ownerList}
        initialData={property as unknown as Record<string, unknown>}
        propertyId={property.id}
      />
    </div>
  );
}
