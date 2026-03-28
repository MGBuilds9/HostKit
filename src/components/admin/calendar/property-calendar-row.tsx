"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
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
    pending: "Pending", offered: "Offered", accepted: "Accepted",
    in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled",
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
              <div key={task.id} className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
                <div className="text-xs text-muted-foreground">
                  {new Date(task.scheduledStart).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  {task.assignedCleaner && <span className="ml-2 text-foreground">· {task.assignedCleaner.fullName}</span>}
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

export function PropertyCalendarRow({ group }: { group: PropertyGroup }) {
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
