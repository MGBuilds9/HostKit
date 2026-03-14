import Link from "next/link";
import { db } from "@/db";
import { properties, owners } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
import { PropertyCard } from "@/components/admin/property-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { eq } from "drizzle-orm";

export default async function PropertiesPage() {
  const session = await requireAuth();

  let propertyList;
  if (session.user.role === "owner") {
    const owner = await db.query.owners.findFirst({
      where: eq(owners.userId, session.user.id),
    });
    propertyList = owner
      ? await db.query.properties.findMany({
          where: eq(properties.ownerId, owner.id),
          with: { owner: true },
        })
      : [];
  } else {
    propertyList = await db.query.properties.findMany({
      with: { owner: true },
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Properties</h1>
        {session.user.role !== "owner" && (
          <Button asChild>
            <Link href="/admin/properties/new">
              <Plus className="h-4 w-4 mr-2" /> Add Property
            </Link>
          </Button>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {propertyList.map((p) => (
          <PropertyCard
            key={p.id}
            id={p.id}
            name={p.name}
            slug={p.slug}
            addressCity={p.addressCity}
            layout={p.layout ?? null}
            active={p.active ?? true}
            ownerName={p.owner.name}
          />
        ))}
      </div>
    </div>
  );
}
