"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CleaningTask {
  id: string;
  status: "pending" | "offered" | "accepted" | "in_progress" | "completed" | "cancelled";
  scheduledStart: string;
  scheduledEnd: string;
  assignedCleaner?: { fullName: string } | null;
}

interface Stay {
  id: string;
  guestName: string | null;
  status: "booked" | "blocked" | "cancelled";
  startDate: string;
  endDate: string;
  cleaningTasks: CleaningTask[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function stayStatusBadge(status: Stay["status"]) {
  if (status === "booked") return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Booked</Badge>;
  if (status === "blocked") return <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100">Blocked</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Cancelled</Badge>;
}

function taskStatusBadge(status: CleaningTask["status"]) {
  const classes: Record<CleaningTask["status"], string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
    offered: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
    accepted: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
    in_progress: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
    completed: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
    cancelled: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  };
  const labels: Record<CleaningTask["status"], string> = {
    pending: "Pending",
    offered: "Offered",
    accepted: "Accepted",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return (
    <Badge className={cn("text-xs", classes[status])}>
      {status === "completed" && <Check className="h-3 w-3 mr-1" />}
      {labels[status]}
    </Badge>
  );
}

export function PropertyCalendar({ propertyId }: { propertyId: string }) {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + 6);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    });
    fetch(`/api/properties/${propertyId}/stays?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load stays: ${r.status}`);
        return r.json();
      })
      .then(setStays)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, fromDate.toISOString()]);

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

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => shiftWeek(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={() => shiftWeek(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground ml-1">
          {formatDate(fromDate)} – {formatDate(toDate)}
        </span>
      </div>

      {/* Content */}
      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && stays.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No stays in this period</p>
        </div>
      )}

      {!loading && !error && stays.length > 0 && (
        <div className="space-y-3">
          {stays.map((stay) => (
            <Card key={stay.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-medium">
                      {stay.status === "blocked"
                        ? "Blocked"
                        : stay.guestName ?? "Guest"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateRange(stay.startDate, stay.endDate)}
                    </p>
                  </div>
                  {stayStatusBadge(stay.status)}
                </div>
              </CardHeader>
              {stay.cleaningTasks && stay.cleaningTasks.length > 0 && (
                <CardContent className="pt-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Cleaning Tasks
                  </p>
                  <div className="space-y-1.5">
                    {stay.cleaningTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2"
                      >
                        <div className="text-xs text-muted-foreground">
                          {new Date(task.scheduledStart).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {task.assignedCleaner && (
                            <span className="ml-2 text-foreground">
                              · {task.assignedCleaner.fullName}
                            </span>
                          )}
                        </div>
                        {taskStatusBadge(task.status)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
