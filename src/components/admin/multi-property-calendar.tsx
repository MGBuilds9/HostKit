"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown, ChevronUp, Check } from "lucide-react";
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

interface PropertyGroup {
  propertyId: string;
  propertyName: string;
  stays: Stay[];
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
  if (status === "booked")
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Booked</Badge>;
  if (status === "blocked")
    return <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100">Blocked</Badge>;
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

function StayCard({ stay }: { stay: Stay }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-medium">
              {stay.status === "blocked" ? "Blocked" : stay.guestName ?? "Guest"}
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
  );
}

function PropertySection({ group }: { group: PropertyGroup }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 w-full text-left"
      >
        <h3 className="text-sm font-semibold text-foreground">{group.propertyName}</h3>
        <Badge variant="secondary" className="text-xs">
          {group.stays.length} {group.stays.length === 1 ? "stay" : "stays"}
        </Badge>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
        )}
      </button>

      {!collapsed && (
        <div className="space-y-2 pl-0">
          {group.stays.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 pl-1">No stays in this period</p>
          ) : (
            group.stays.map((stay) => <StayCard key={stay.id} stay={stay} />)
          )}
        </div>
      )}
    </div>
  );
}

export function MultiPropertyCalendar() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [groups, setGroups] = useState<PropertyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propertyFilter, setPropertyFilter] = useState<string>("all");

  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + 6);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    });
    fetch(`/api/calendar?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load calendar: ${r.status}`);
        return r.json();
      })
      .then(setGroups)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate.toISOString()]);

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

  const filteredGroups =
    propertyFilter === "all"
      ? groups
      : groups.filter((g) => g.propertyId === propertyFilter);

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
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
        <span className="text-sm text-muted-foreground">
          {formatDate(fromDate)} – {formatDate(toDate)}
        </span>

        {groups.length > 1 && (
          <div className="ml-auto w-48">
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All properties</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.propertyId} value={g.propertyId}>
                    {g.propertyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Content */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-40 rounded bg-muted animate-pulse" />
              <div className="h-20 rounded-lg bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && filteredGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No stays in this period</p>
        </div>
      )}

      {!loading && !error && filteredGroups.length > 0 && (
        <div className="space-y-6 divide-y divide-border">
          {filteredGroups.map((group) => (
            <div key={group.propertyId} className="pt-4 first:pt-0">
              <PropertySection group={group} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
