export const dynamic = "force-dynamic";

import { db } from "@/db";
import { owners, properties, stays } from "@/db/schema";
import { eq, and, gte, or } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { OwnerPropertyCard } from "@/components/owner/owner-property-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2 } from "lucide-react";

export default async function OwnerPropertiesPage() {
  const session = await requireAuth(["owner", "admin"]);

  const owner = await db.query.owners.findFirst({
    where: or(
      eq(owners.userId, session.user.id),
      eq(owners.email, session.user.email!)
    ),
  });

  if (!owner) {
    if (session.user.role === "admin") redirect("/admin");
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        <p className="text-muted-foreground">
          Your owner profile has not been set up yet. Please contact your property manager.
        </p>
      </div>
    );
  }

  const ownerProperties = await db.query.properties.findMany({
    where: eq(properties.ownerId, owner.id),
    orderBy: (p, { asc }) => [asc(p.name)],
  });

  // Count upcoming stays per property
  const now = new Date();
  const propertiesWithStays = await Promise.all(
    ownerProperties.map(async (prop) => {
      const upcomingStays = await db.query.stays.findMany({
        where: and(
          eq(stays.propertyId, prop.id),
          gte(stays.startDate, now),
          eq(stays.status, "booked")
        ),
      });
      return {
        ...prop,
        upcomingStayCount: upcomingStays.length,
      };
    })
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>

      {propertiesWithStays.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties"
          description="You don't have any properties linked to your account yet."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {propertiesWithStays.map((prop) => (
            <OwnerPropertyCard
              key={prop.id}
              id={prop.id}
              name={prop.name}
              addressStreet={prop.addressStreet}
              addressCity={prop.addressCity}
              layout={prop.layout}
              active={prop.active}
              upcomingStayCount={prop.upcomingStayCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
