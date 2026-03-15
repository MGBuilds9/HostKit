export const dynamic = "force-dynamic";

import { db } from "@/db";
import { properties, turnovers, owners, stays, cleaningTasks } from "@/db/schema";
import { count, eq, gte, lte, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Users,
  ClipboardCheck,
  CalendarDays,
  SprayCan,
  ArrowRight,
  Clock,
  Home,
} from "lucide-react";
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

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    offered: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    in_progress: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
    completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  // Primary stats (top row) — larger cards
  const primaryStats = [
    {
      label: "Properties",
      value: propertyCount.count,
      icon: Building2,
      href: "/admin/properties",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      label: "Upcoming Stays",
      value: upcomingStays.length,
      icon: CalendarDays,
      href: "/admin/calendar",
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/50",
    },
    {
      label: "Pending Cleans",
      value: pendingTaskCount,
      icon: SprayCan,
      href: "/admin/cleaning-tasks",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/50",
    },
  ];

  // Secondary stats (smaller, below)
  const secondaryStats = [
    { label: "Owners", value: ownerCount.count, icon: Users, href: "/admin/owners" },
    { label: "Turnovers", value: turnoverCount.count, icon: ClipboardCheck, href: "/admin/turnovers" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Primary Stats — 3-col grid, responsive */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {primaryStats.map(({ label, value, icon: Icon, href, color, bg }) => (
          <Link key={label} href={href} className="block">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className={`inline-flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-lg ${bg} mb-3`}>
                  <Icon className={`h-4 w-4 md:h-5 md:w-5 ${color}`} />
                </div>
                <div className="text-2xl md:text-3xl font-bold tracking-tight">{value}</div>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Secondary Stats — inline row */}
      <div className="flex gap-3 md:gap-4">
        {secondaryStats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="block flex-1">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-3 md:p-4 flex items-center gap-3">
                <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-lg md:text-xl font-bold">{value}</div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main content: Tasks + Stays side by side on desktop, stacked on mobile */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Cleaning Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Today&apos;s Tasks
              </CardTitle>
              <Link
                href="/admin/cleaning-tasks"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {todaysTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <SprayCan className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No tasks today</p>
                <p className="text-xs text-muted-foreground mt-0.5">All clear for now</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaysTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{task.property.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(task.scheduledStart).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {" - "}
                        {new Date(task.scheduledEnd).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {task.assignedCleaner && (
                          <span className="ml-1">
                            &middot; {task.assignedCleaner.fullName}
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ml-2 ${
                        statusColors[task.status ?? "pending"] || ""
                      }`}
                    >
                      {(task.status ?? "pending").replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Stays */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                Upcoming Stays
              </CardTitle>
              <Link
                href="/admin/calendar"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingStays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No upcoming stays</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Stays will appear once calendars are synced
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingStays.map((stay) => (
                  <div
                    key={stay.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {stay.guestName || "Guest"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stay.property.name} &middot;{" "}
                        {new Date(stay.startDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                        {" - "}
                        {new Date(stay.endDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 whitespace-nowrap ml-2">
                      {stay.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
