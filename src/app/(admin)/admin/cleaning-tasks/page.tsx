"use client";

import { useState, useEffect, useCallback } from "react";
import { TaskFilters } from "./_components/task-filters";
import { TaskTable } from "./_components/task-table";

interface Cleaner {
  id: string;
  fullName: string;
}

type TaskStatus = "pending" | "offered" | "accepted" | "in_progress" | "completed" | "cancelled";

interface CleaningTask {
  id: string;
  status: TaskStatus;
  scheduledStart: string;
  scheduledEnd: string;
  assignedCleanerId: string | null;
  assignedCleaner?: { fullName: string } | null;
  notes: string | null;
  propertyId: string;
  property?: { name: string } | null;
  stayId: string | null;
  stay?: { guestName: string | null } | null;
}

export default function CleaningTasksPage() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");

  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + 6);

  const properties = Array.from(
    new Map(
      tasks
        .filter((t) => t.property)
        .map((t) => [t.propertyId, t.property!.name])
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  const fetchTasks = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    });
    fetch(`/api/calendar?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load tasks: ${r.status}`);
        return r.json();
      })
      .then((groups: Array<{ propertyId: string; propertyName: string; stays: Array<{ cleaningTasks: CleaningTask[] }> }>) => {
        const allTasks: CleaningTask[] = [];
        for (const group of groups) {
          for (const stay of group.stays) {
            if (stay.cleaningTasks) {
              for (const task of stay.cleaningTasks) {
                allTasks.push({ ...task, property: { name: group.propertyName }, propertyId: group.propertyId });
              }
            }
          }
        }
        allTasks.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
        setTasks(allTasks);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate.toISOString()]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    fetch("/api/cleaners").then((r) => r.ok ? r.json() : []).then(setCleaners).catch(() => setCleaners([]));
  }, []);

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (propertyFilter !== "all" && t.propertyId !== propertyFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Cleaning Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">All cleaning tasks across properties.</p>
      </div>
      <TaskFilters
        fromDate={fromDate}
        toDate={toDate}
        statusFilter={statusFilter}
        propertyFilter={propertyFilter}
        properties={properties}
        onShiftWeek={(delta) => setFromDate((prev) => { const d = new Date(prev); d.setDate(d.getDate() + delta * 7); return d; })}
        onGoToToday={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setFromDate(d); }}
        onStatusChange={setStatusFilter}
        onPropertyChange={setPropertyFilter}
      />
      <TaskTable tasks={filteredTasks} cleaners={cleaners} loading={loading} error={error} onUpdate={fetchTasks} />
    </div>
  );
}
