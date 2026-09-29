import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { properties, accounts, stays, users } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { IcalSettingsForm } from "@/components/admin/ical-settings-form";
import { ConnectionStatus } from "@/components/admin/ical-settings/connection-status";
import { PropertyInvites } from "@/components/admin/property-invites";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: { id: string };
}

export default async function PropertySettingsPage({ params }: Props) {
  const session = await requireAuth(["admin", "manager"]);

  const property = await db.query.properties.findFirst({
    where: eq(properties.id, params.id),
  });

  if (!property) notFound();

  // Resolve the connected Google account's email + whether that user still has
  // a google accounts row (dangling-pointer detection), for the status card.
  let connectedEmail: string | null = null;
  let connectedUserHasGoogleAccount = true;
  if (property.calendarConnectedByUserId) {
    const [u] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, property.calendarConnectedByUserId))
      .limit(1);
    connectedEmail = u?.email ?? null;
    const [acc] = await db
      .select({ id: accounts.userId })
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, property.calendarConnectedByUserId),
          eq(accounts.provider, "google")
        )
      )
      .limit(1);
    connectedUserHasGoogleAccount = !!acc;
  }

  const syncedStays = await db
    .select({ id: stays.id })
    .from(stays)
    .where(and(eq(stays.propertyId, property.id), ne(stays.status, "cancelled")));

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href={`/admin/properties/${property.id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Property
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{property.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Calendar sync &amp; turnover settings
        </p>
      </div>

      <ConnectionStatus
        calendarConnectedByUserId={property.calendarConnectedByUserId ?? null}
        connectedEmail={connectedEmail}
        connectedUserHasGoogleAccount={connectedUserHasGoogleAccount}
        staysSyncedCount={syncedStays.length}
        lastSyncAt={property.lastSyncAt ? property.lastSyncAt.toISOString() : null}
        lastSyncStatus={property.lastSyncStatus ?? null}
        lastSyncError={property.lastSyncError ?? null}
      />

      <IcalSettingsForm
        property={property}
        calendarConnectedByEmail={connectedEmail}
        currentUserRole={session.user.role}
      />

      {session.user.role === "admin" && (
        <PropertyInvites propertyId={property.id} ownerId={property.ownerId} />
      )}
    </div>
  );
}
