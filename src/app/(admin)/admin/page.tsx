export const dynamic = "force-dynamic";

import { db } from "@/db";
import { properties, turnovers, owners, stays, cleaningTasks } from "@/db/schema";
import { count, eq, gte, lte, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, ClipboardCheck, CalendarDays, SprayCan } from "lucide-react";
import Link from "next/link";

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

  // Upcoming stays (next 7 days)
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

  // Today's cleaning tasks
  const todaysTasks = await db.query.cleaningTasks.findMany({
    where: and(
      gte(cleaningTasks.scheduledStart, today),
      lte(cleaningTasks.scheduledStart, tomorrow),
    ),
    with: { property: true, assignedCleaner: true },
    orderBy: (t, { asc }) => [asc(t.scheduledStart)],
  });

  const pendingTaskCount = todaysTasks.filter(t => t.status !== "completed" && t.status !== "cancelled").length;

  const stats = [
    { label: "Properties", value: propertyCount.count, icon: Building2, href: "/admin/properties" },
    { label: "Owners", value: ownerCount.count, icon: Users, href: "/admin/owners" },
    { label: "Turnovers", value: turnoverCount.count, icon: ClipboardCheck, href: "/admin/turnovers" },
    { label: "Upcoming Stays", value: upcomingStays.length, icon: CalendarDays, href: "/admin/calendar" },
    { label: "Pending Cleans", value: pendingTaskCount, icon: SprayCan, href: "/admin/cleaning-tasks" },
  ];

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    offered: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      {/* Mobile: horizontal scroll strip */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide md:hidden">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <Card className="min-w-[140px] shrink-0">
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <div className="text-2xl font-bold">{value}</div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid gap-4 md:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:bg-accent/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Today's Tasks */}
      {todaysTasks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Today&apos;s Cleaning Tasks</h2>
          <div className="space-y-2">
            {todaysTasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{task.property.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(task.scheduledStart).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      {" - "}
                      {new Date(task.scheduledEnd).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      {task.assignedCleaner && ` · ${task.assignedCleaner.fullName}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[task.status ?? "pending"] || ""}`}>
                    {(task.status ?? "pending").replace("_", " ")}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Stays */}
      {upcomingStays.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Upcoming Stays</h2>
            <Link href="/admin/calendar" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingStays.map((stay) => (
              <Card key={stay.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{stay.guestName || "Guest"}</p>
                    <p className="text-sm text-muted-foreground">
                      {stay.property.name} · {new Date(stay.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" - "}
                      {new Date(stay.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800">
                    {stay.status}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
