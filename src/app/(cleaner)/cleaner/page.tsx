"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { type TaskCardTask } from "@/components/cleaner/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { TodayTasks } from "./_components/today-tasks";
import { StatsSummary } from "./_components/stats-summary";

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
    (a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
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
    try {
      const res = await fetch(
        `/api/calendar?from=${encodeURIComponent(today.toISOString())}&to=${encodeURIComponent(in7Days.toISOString())}`
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
        <h1 className="text-xl font-semibold mb-4">Today</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12"><p className="text-destructive font-medium">{error}</p></div>;
  }

  const todayTasks = tasks.filter((t) => isToday(t.scheduledStart));
  const upcomingTasks = tasks.filter((t) => !isToday(t.scheduledStart));

  return (
    <div className="space-y-8">
      <TodayTasks tasks={todayTasks} onStatusChange={handleStatusChange} />
      <StatsSummary tasks={upcomingTasks} onStatusChange={handleStatusChange} />
    </div>
  );
}
