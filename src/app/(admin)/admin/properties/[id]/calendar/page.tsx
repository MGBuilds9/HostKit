import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { PropertyCalendar } from "@/components/admin/property-calendar";
import { SyncStatusCard } from "@/components/admin/sync-status-card";
import { Button } from "@/components/ui/button";
import { Settings, ArrowLeft } from "lucide-react";

interface Props {
  params: { id: string };
}

export default async function PropertyCalendarPage({ params }: Props) {
  await requireAuth();

  const property = await db.query.properties.findFirst({
    where: eq(properties.id, params.id),
  });

  if (!property) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild className="-ml-2">
              <Link href={`/admin/properties/${property.id}`}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-semibold">{property.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Property Calendar</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/properties/${property.id}/settings`}>
            <Settings className="h-4 w-4 mr-1.5" /> Settings
          </Link>
        </Button>
      </div>

      {/* Sync status */}
      <SyncStatusCard
        propertyId={property.id}
        lastSyncAt={property.lastSyncAt ? property.lastSyncAt.toISOString() : null}
        lastSyncStatus={property.lastSyncStatus ?? null}
        lastSyncError={property.lastSyncError ?? null}
      />

      {/* Calendar */}
      <PropertyCalendar propertyId={property.id} />
    </div>
  );
}
