export const dynamic = "force-dynamic";

import { db } from "@/db";
import { owners, properties, stays, turnovers } from "@/db/schema";
import { eq, and, gte, or } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { OwnerDashboard } from "@/components/owner/owner-dashboard";

export default async function OwnerDashboardPage() {
  const session = await requireAuth(["owner", "admin"]);

  // Find the owner record for the logged-in user
  const owner = await db.query.owners.findFirst({
    where: or(
      eq(owners.userId, session.user.id),
      eq(owners.email, session.user.email!)
    ),
  });

  if (!owner) {
    // Admin without an owner record — redirect to admin dashboard
    if (session.user.role === "admin") redirect("/admin");
    // Owner without a record — show empty state
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Your owner profile has not been set up yet. Please contact your property manager.
        </p>
      </div>
    );
  }

  // Get owner's properties
  const ownerProperties = await db.query.properties.findMany({
    where: eq(properties.ownerId, owner.id),
  });

  const propertyIds = ownerProperties.map((p) => p.id);

  // Count upcoming stays (next 30 days)
  const now = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

  let upcomingStaysCount = 0;
  let upcomingStaysList: Array<{
    id: string;
    propertyName: string;
    guestName: string | null;
    startDate: string;
    endDate: string;
  }> = [];

  let recentTurnoversList: Array<{
    id: string;
    propertyName: string;
    completedAt: string;
    completedBy: string | null;
  }> = [];

  let lastTurnoverDate: string | null = null;

  if (propertyIds.length > 0) {
    // Get upcoming stays
    for (const prop of ownerProperties) {
      const propStays = await db.query.stays.findMany({
        where: and(
          eq(stays.propertyId, prop.id),
          gte(stays.startDate, now),
          eq(stays.status, "booked")
        ),
        orderBy: (s, { asc }) => [asc(s.startDate)],
        limit: 10,
      });

      for (const s of propStays) {
        upcomingStaysList.push({
          id: s.id,
          propertyName: prop.name,
          guestName: s.guestName,
          startDate: s.startDate.toISOString(),
          endDate: s.endDate.toISOString(),
        });
      }
    }

    upcomingStaysCount = upcomingStaysList.length;
    // Sort and limit to 5
    upcomingStaysList = upcomingStaysList
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5);

    // Get recent turnovers
    for (const prop of ownerProperties) {
      const propTurnovers = await db.query.turnovers.findMany({
        where: eq(turnovers.propertyId, prop.id),
        orderBy: (t, { desc }) => [desc(t.completedAt)],
        limit: 5,
      });

      for (const t of propTurnovers) {
        recentTurnoversList.push({
          id: t.id,
          propertyName: prop.name,
          completedAt: t.completedAt.toISOString(),
          completedBy: t.completedBy,
        });
      }
    }

    // Sort and limit to 5
    recentTurnoversList = recentTurnoversList
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 5);

    if (recentTurnoversList.length > 0) {
      lastTurnoverDate = recentTurnoversList[0].completedAt;
    }
  }

  // Calculate occupancy rate (stays in last 30 days / total days / properties)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  let totalStayDays = 0;

  if (propertyIds.length > 0) {
    for (const prop of ownerProperties) {
      const recentStays = await db.query.stays.findMany({
        where: and(
          eq(stays.propertyId, prop.id),
          gte(stays.endDate, thirtyDaysAgo),
          eq(stays.status, "booked")
        ),
      });

      for (const s of recentStays) {
        const start = s.startDate > thirtyDaysAgo ? s.startDate : thirtyDaysAgo;
        const end = s.endDate < now ? s.endDate : now;
        const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        totalStayDays += days;
      }
    }
  }

  const totalPossibleDays = propertyIds.length * 30;
  const occupancyRate = totalPossibleDays > 0
    ? Math.round((totalStayDays / totalPossibleDays) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, {owner.name}
        </p>
      </div>

      <OwnerDashboard
        propertyCount={ownerProperties.length}
        upcomingStaysCount={upcomingStaysCount}
        lastTurnoverDate={lastTurnoverDate}
        occupancyRate={occupancyRate}
        recentTurnovers={recentTurnoversList}
        upcomingStays={upcomingStaysList}
      />
    </div>
  );
}
