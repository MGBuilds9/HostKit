export const dynamic = "force-dynamic";

import { db } from "@/db";
import { cleaners, cleaningTasks } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  offered: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default async function CleanerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAuth(["admin", "manager"]);

  const cleaner = await db.query.cleaners.findFirst({
    where: eq(cleaners.id, params.id),
  });

  if (!cleaner) notFound();

  const tasks = await db.query.cleaningTasks.findMany({
    where: eq(cleaningTasks.assignedCleanerId, cleaner.id),
    with: { property: true, stay: true },
    orderBy: desc(cleaningTasks.scheduledStart),
    limit: 100,
  });

  const now = new Date();

  // Week boundaries (Mon–Sun)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Month boundaries
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const upcomingTasks = tasks.filter(
    (t) => new Date(t.scheduledStart) >= now && t.status !== "cancelled"
  );
  const pastTasks = tasks.filter(
    (t) => new Date(t.scheduledStart) < now || t.status === "cancelled"
  );

  const thisWeekTasks = tasks.filter((t) => {
    const d = new Date(t.scheduledStart);
    return d >= startOfWeek && d <= endOfWeek && t.status !== "cancelled";
  });

  const thisMonthTasks = tasks.filter((t) => {
    const d = new Date(t.scheduledStart);
    return d >= startOfMonth && d <= endOfMonth && t.status !== "cancelled";
  });

  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div>
      <Link
        href="/admin/cleaners"
        className="text-sm text-primary hover:underline mb-4 block"
      >
        &larr; Back to Cleaners
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{cleaner.fullName}</h1>
          <div className="mt-1 space-y-0.5">
            {cleaner.email && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                <a href={`mailto:${cleaner.email}`} className="hover:underline">
                  {cleaner.email}
                </a>
              </p>
            )}
            {cleaner.phone && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                <a href={`tel:${cleaner.phone}`} className="hover:underline">
                  {cleaner.phone}
                </a>
              </p>
            )}
          </div>
        </div>
        <Badge variant={cleaner.isActive ? "default" : "secondary"}>
          {cleaner.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Workload Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisWeekTasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthTasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingTasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Upcoming Tasks</h2>
          <div className="space-y-2">
            {upcomingTasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{task.property.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(task.scheduledStart).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {new Date(task.scheduledStart).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {" – "}
                      {new Date(task.scheduledEnd).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {task.stay?.guestName && ` · ${task.stay.guestName}`}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${task.status ? (statusColors[task.status] ?? "") : ""}`}
                  >
                    {task.status?.replace("_", " ") ?? "—"}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Tasks */}
      {pastTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Past Tasks</h2>
          <div className="space-y-2">
            {pastTasks.slice(0, 20).map((task) => (
              <Card key={task.id} className="opacity-70">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{task.property.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(task.scheduledStart).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${task.status ? (statusColors[task.status] ?? "") : ""}`}
                  >
                    {task.status?.replace("_", " ") ?? "—"}
                  </span>
                </CardContent>
              </Card>
            ))}
            {pastTasks.length > 20 && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                Showing 20 of {pastTasks.length} past tasks
              </p>
            )}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No tasks assigned yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
