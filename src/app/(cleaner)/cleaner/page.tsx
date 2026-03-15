"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { TaskCard, type TaskCardTask } from "@/components/cleaner/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SprayCan } from "lucide-react";

type TaskStatus =
  | "pending"
  | "offered"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

interface CalendarTask {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: TaskStatus;
  triggerType?: string | null;
  assignedCleaner?: { id: string; fullName: string } | null;
}

interface CalendarStay {
  id: string;
  guestName?: string | null;
  cleaningTasks: CalendarTask[];
}

interface CalendarEntry {
  property: { id: string; name: string };
  stays: CalendarStay[];
}

function flattenTasks(data: CalendarEntry[]): TaskCardTask[] {
  const tasks: TaskCardTask[] = [];
  for (const entry of data) {
    for (const stay of entry.stays) {
      for (const task of stay.cleaningTasks) {
        tasks.push({
          id: task.id,
          propertyName: entry.property.name,
          scheduledStart: task.scheduledStart,
          scheduledEnd: task.scheduledEnd,
          status: task.status,
          guestName: stay.guestName,
          triggerType: task.triggerType,
        });
      }
    }
  }
  return tasks.sort(
    (a, b) =>
      new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
  );
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function CleanerDashboardPage() {
  const { status: sessionStatus } = useSession();
  const [tasks, setTasks] = useState<TaskCardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    in7Days.setHours(23, 59, 59, 999);

    const from = today.toISOString();
    const to = in7Days.toISOString();

    try {
      const res = await fetch(`/api/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (!res.ok) throw new Error("Failed to load tasks");
      const data: CalendarEntry[] = await res.json();
      setTasks(flattenTasks(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchTasks();
    }
  }, [sessionStatus, fetchTasks]);

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    const res = await fetch(`/api/cleaning-tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) throw new Error("Failed to update task");

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  }

  if (sessionStatus === "loading" || loading) {
    return (
      <div>
        <h1 className="text-xl font-semibold mb-4">Today</h1>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive font-medium">{error}</p>
      </div>
    );
  }

  const todayTasks = tasks.filter((t) => isToday(t.scheduledStart));
  const upcomingTasks = tasks.filter((t) => !isToday(t.scheduledStart));

  return (
    <div className="space-y-8">
      {/* Today's Tasks */}
      <section>
        <h1 className="text-xl font-semibold mb-4">
          Today&apos;s Tasks
          {todayTasks.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({todayTasks.length})
            </span>
          )}
        </h1>

        {todayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <SprayCan className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">No tasks today</p>
            <p className="text-sm text-muted-foreground">Enjoy your day off!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Upcoming
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              (next 7 days)
            </span>
          </h2>
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
