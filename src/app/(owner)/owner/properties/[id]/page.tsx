export const dynamic = "force-dynamic";

import { db } from "@/db";
import { owners, properties, stays, turnovers } from "@/db/schema";
import { eq, and, gte, or } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function OwnerPropertyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireAuth(["owner", "admin"]);

  const owner = await db.query.owners.findFirst({
    where: or(
      eq(owners.userId, session.user.id),
      eq(owners.email, session.user.email!)
    ),
  });

  if (!owner) {
    if (session.user.role === "admin") redirect("/admin");
    notFound();
  }

  const property = await db.query.properties.findFirst({
    where: and(
      eq(properties.id, params.id),
      eq(properties.ownerId, owner.id)
    ),
  });

  if (!property) notFound();

  // Get upcoming stays
  const now = new Date();
  const upcomingStays = await db.query.stays.findMany({
    where: and(
      eq(stays.propertyId, property.id),
      gte(stays.startDate, now),
      eq(stays.status, "booked")
    ),
    orderBy: (s, { asc }) => [asc(s.startDate)],
    limit: 20,
  });

  // Get recent turnovers
  const recentTurnovers = await db.query.turnovers.findMany({
    where: eq(turnovers.propertyId, property.id),
    orderBy: (t, { desc: d }) => [d(t.completedAt)],
    limit: 10,
  });

  return (
    <div className="space-y-6">
      {/* Property Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-semibold">{property.name}</h1>
          <Badge variant={property.active ? "default" : "secondary"}>
            {property.active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          {property.addressStreet}
          {property.addressUnit && ` Unit ${property.addressUnit}`},{" "}
          {property.addressCity}, {property.addressProvince}{" "}
          {property.addressPostal}
        </p>
        {property.layout && (
          <p className="text-sm text-muted-foreground mt-1">
            Layout: {property.layout}
          </p>
        )}
      </div>

      {/* Property Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Check-in</dt>
              <dd className="font-medium">{property.checkinTime}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Check-out</dt>
              <dd className="font-medium">{property.checkoutTime}</dd>
            </div>
            {property.wifiName && (
              <div>
                <dt className="text-muted-foreground">WiFi</dt>
                <dd className="font-medium">{property.wifiName}</dd>
              </div>
            )}
            {property.parkingSpot && (
              <div>
                <dt className="text-muted-foreground">Parking</dt>
                <dd className="font-medium">{property.parkingSpot}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Upcoming Stays */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Upcoming Stays ({upcomingStays.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingStays.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No upcoming stays
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingStays.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {s.guestName ?? "Guest"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(s.startDate)} &ndash; {formatDate(s.endDate)}
                    </p>
                  </div>
                  <Badge>Booked</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Turnovers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Recent Turnovers ({recentTurnovers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTurnovers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No turnovers recorded
            </p>
          ) : (
            <div className="space-y-3">
              {recentTurnovers.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {formatDate(t.completedAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.completedBy
                        ? `Completed by ${t.completedBy}`
                        : "Completed"}
                    </p>
                  </div>
                  <Badge variant="secondary">Completed</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
