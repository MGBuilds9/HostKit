import { db } from "@/db";
import { properties, owners } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-guard";
import { PropertyForm } from "@/components/admin/property-form";

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
  await requireAuth(["admin", "manager"]);

  const property = await db.query.properties.findFirst({
    where: eq(properties.id, params.id),
  });
  if (!property) notFound();

  const ownerList = await db.select({ id: owners.id, name: owners.name }).from(owners);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Edit {property.name}</h1>
      <PropertyForm
        owners={ownerList}
        initialData={property as unknown as Record<string, unknown>}
        propertyId={property.id}
      />
    </div>
  );
}
