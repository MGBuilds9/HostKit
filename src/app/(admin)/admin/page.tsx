export const dynamic = "force-dynamic";

import { db } from "@/db";
import { properties, turnovers, owners, stays, cleaningTasks } from "@/db/schema";
import { count, eq, gte, lte, and } from "drizzle-orm";
import { StatsRow } from "./_components/stats-row";
import { RecentActivity } from "./_components/recent-activity";
import { UpcomingSection } from "./_components/upcoming-section";

export default async function DashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const [propertyCount] = await db.select({ count: count() }).from(properties);
  const [ownerCount] = await db.select({ count: count() }).from(owners);
  const [turnoverCount] = await db.select({ count: count() }).from(turnovers);

  const upcomingStays = await db.query.stays.findMany({
    where: and(
      gte(stays.startDate, today),
      lte(stays.startDate, nextWeek),
      eq(stays.status, "booked")
    ),
    with: { property: true },
    orderBy: (s, { asc }) => [asc(s.startDate)],
    limit: 10,
  });

  const todaysTasks = await db.query.cleaningTasks.findMany({
    where: and(
      gte(cleaningTasks.scheduledStart, today),
      lte(cleaningTasks.scheduledStart, tomorrow),
    ),
    with: { property: true, assignedCleaner: true },
    orderBy: (t, { asc }) => [asc(t.scheduledStart)],
  });

  const pendingTaskCount = todaysTasks.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {today.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      <StatsRow
        propertyCount={propertyCount.count}
        upcomingStaysCount={upcomingStays.length}
        pendingTaskCount={pendingTaskCount}
        ownerCount={ownerCount.count}
        turnoverCount={turnoverCount.count}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity todaysTasks={todaysTasks} />
        <UpcomingSection upcomingStays={upcomingStays} />
      </div>
    </div>
  );
}
