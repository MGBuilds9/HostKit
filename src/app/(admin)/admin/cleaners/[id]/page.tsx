export const dynamic = "force-dynamic";

import { db } from "@/db";
import { cleaners, cleaningTasks } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CleanerHeader } from "./_components/cleaner-header";
import { CleanerStats } from "./_components/cleaner-stats";
import { CleanerTaskList } from "./_components/cleaner-task-list";

export default async function CleanerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAuth(["admin", "manager"]);

  const cleaner = await db.query.cleaners.findFirst({
    where: eq(cleaners.id, params.id),
  });

  if (!cleaner) return notFound();

  const tasks = await db.query.cleaningTasks.findMany({
    where: eq(cleaningTasks.assignedCleanerId, cleaner.id),
    with: { property: true, stay: true },
    orderBy: desc(cleaningTasks.scheduledStart),
    limit: 100,
  });

  const now = new Date();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const upcomingTasks = tasks.filter(
    (t) => new Date(t.scheduledStart) >= now && t.status !== "cancelled"
  );
  const pastTasks = tasks.filter(
    (t) => new Date(t.scheduledStart) < now || t.status === "cancelled"
  );

  const thisWeekCount = tasks.filter((t) => {
    const d = new Date(t.scheduledStart);
    return d >= startOfWeek && d <= endOfWeek && t.status !== "cancelled";
  }).length;

  const thisMonthCount = tasks.filter((t) => {
    const d = new Date(t.scheduledStart);
    return d >= startOfMonth && d <= endOfMonth && t.status !== "cancelled";
  }).length;

  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div>
      <CleanerHeader cleaner={cleaner} />
      <CleanerStats
        thisWeekCount={thisWeekCount}
        thisMonthCount={thisMonthCount}
        upcomingCount={upcomingTasks.length}
        completedCount={completedCount}
      />
      <CleanerTaskList upcomingTasks={upcomingTasks} pastTasks={pastTasks} />
    </div>
  );
}
