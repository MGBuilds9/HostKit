import { db } from "@/db";
import { properties, owners } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-guard";
import { PropertyHeader } from "./_components/property-header";
import { PropertyDetails } from "./_components/property-details";

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const session = await requireAuth();

  const property = await db.query.properties.findFirst({
    where: eq(properties.id, params.id),
    with: { owner: true },
  });

  if (!property) notFound();

  if (session.user.role === "owner") {
    const owner = await db.query.owners.findFirst({
      where: or(
        eq(owners.userId, session.user.id),
        eq(owners.email, session.user.email!)
      ),
    });
    if (!owner || property.ownerId !== owner.id) notFound();
  }

  const guideUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/g/${property.slug}`;

  return (
    <div className="max-w-4xl space-y-6">
      <PropertyHeader property={property} guideUrl={guideUrl} />
      <PropertyDetails property={property} />
    </div>
  );
}
