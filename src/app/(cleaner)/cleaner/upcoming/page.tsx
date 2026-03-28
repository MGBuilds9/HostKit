"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { type TaskCardTask } from "@/components/cleaner/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { UpcomingTaskList } from "./_components/upcoming-task-list";

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
}

interface CalendarEntry {
  property: { id: string; name: string };
  stays: Array<{
    guestName?: string | null;
    cleaningTasks: CalendarTask[];
  }>;
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
    (a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
  );
}

function groupByDate(tasks: TaskCardTask[]): Map<string, TaskCardTask[]> {
  const groups = new Map<string, TaskCardTask[]>();
  for (const task of tasks) {
    const key = new Date(task.scheduledStart).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const list = groups.get(key) ?? [];
    list.push(task);
    groups.set(key, list);
  }
  return groups;
}

export default function UpcomingPage() {
  const { status: sessionStatus } = useSession();
  const [tasks, setTasks] = useState<TaskCardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const in14Days = new Date(tomorrow);
    in14Days.setDate(in14Days.getDate() + 13);
    in14Days.setHours(23, 59, 59, 999);
    try {
      const res = await fetch(
        `/api/calendar?from=${encodeURIComponent(tomorrow.toISOString())}&to=${encodeURIComponent(in14Days.toISOString())}`
      );
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
    if (sessionStatus === "authenticated") fetchTasks();
  }, [sessionStatus, fetchTasks]);

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    const res = await fetch(`/api/cleaning-tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error("Failed to update task");
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
  }

  if (sessionStatus === "loading" || loading) {
    return (
      <div>
        <h1 className="text-xl font-semibold mb-4">Upcoming</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12"><p className="text-destructive font-medium">{error}</p></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">
        Upcoming
        <span className="ml-2 text-sm font-normal text-muted-foreground">(next 14 days)</span>
      </h1>
      <UpcomingTaskList
        tasks={tasks}
        grouped={groupByDate(tasks)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
