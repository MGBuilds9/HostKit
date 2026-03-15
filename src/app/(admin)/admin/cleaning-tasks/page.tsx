"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CleaningTaskStatus } from "@/components/admin/cleaning-task-status";
import { SprayCan, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type TaskStatus = "pending" | "offered" | "accepted" | "in_progress" | "completed" | "cancelled";

interface Cleaner {
  id: string;
  fullName: string;
}

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

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  offered: "Offered",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function taskStatusBadge(status: TaskStatus) {
  const classes: Record<TaskStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
    offered: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
    accepted: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
    in_progress: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
    completed: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
    cancelled: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  };
  return (
    <Badge className={cn("text-xs", classes[status])}>
      {status === "completed" && <Check className="h-3 w-3 mr-1" />}
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

  // Derive unique properties from tasks for the filter
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
        // Flatten all cleaning tasks from the calendar response
        const allTasks: CleaningTask[] = [];
        for (const group of groups) {
          for (const stay of group.stays) {
            if (stay.cleaningTasks) {
              for (const task of stay.cleaningTasks) {
                allTasks.push({
                  ...task,
                  property: { name: group.propertyName },
                  propertyId: group.propertyId,
                });
              }
            }
          }
        }
        // Sort by scheduledStart ascending
        allTasks.sort(
          (a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
        );
        setTasks(allTasks);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate.toISOString()]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetch("/api/cleaners")
      .then((r) => r.ok ? r.json() : [])
      .then(setCleaners)
      .catch(() => setCleaners([]));
  }, []);

  function goToToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setFromDate(d);
  }

  function shiftWeek(delta: number) {
    setFromDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });
  }

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (propertyFilter !== "all" && t.propertyId !== propertyFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Cleaning Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All cleaning tasks across properties.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Date nav */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => shiftWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => shiftWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm text-muted-foreground self-center">
          {formatDate(fromDate)} – {formatDate(toDate)}
        </span>

        <div className="flex gap-2 ml-auto flex-wrap">
          {/* Status filter */}
          <div className="w-40">
            <Label className="sr-only">Filter by status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Property filter */}
          {properties.length > 1 && (
            <div className="w-48">
              <Label className="sr-only">Filter by property</Label>
              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All properties</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filteredTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <SprayCan className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No cleaning tasks in this period</p>
        </div>
      )}

      {/* Tasks — table on desktop, cards on mobile */}
      {!loading && !error && filteredTasks.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Scheduled</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cleaner</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(task.scheduledStart).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {task.property?.name ?? "—"}
                        {task.stay?.guestName && (
                          <span className="block text-xs text-muted-foreground font-normal">
                            Guest: {task.stay.guestName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{taskStatusBadge(task.status)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {task.assignedCleaner?.fullName ?? "Unassigned"}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <CleaningTaskStatus
                          task={task}
                          cleaners={cleaners}
                          onUpdate={fetchTasks}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredTasks.map((task) => (
              <Card key={task.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {task.property?.name ?? "Unknown property"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(task.scheduledStart).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {task.stay?.guestName && ` · Guest: ${task.stay.guestName}`}
                      </p>
                    </div>
                    {taskStatusBadge(task.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <CleaningTaskStatus
                    task={task}
                    cleaners={cleaners}
                    onUpdate={fetchTasks}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
