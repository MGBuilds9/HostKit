"use client";

import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CleaningTask,
  Stay,
  formatDateRange,
  TASK_STATUS_CLASSES,
  TASK_STATUS_LABELS,
} from "./calendar-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function stayStatusBadge(status: Stay["status"]) {
  if (status === "booked")
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Booked</Badge>;
  if (status === "blocked")
    return <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100">Blocked</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Cancelled</Badge>;
}

export function taskStatusBadge(status: CleaningTask["status"]) {
  return (
    <Badge className={cn("text-xs", TASK_STATUS_CLASSES[status])}>
      {status === "completed" && <Check className="h-3 w-3 mr-1" />}
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}

export function StayCard({ stay }: { stay: Stay }) {
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
                  {new Date(task.scheduledStart).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                  })}
                  {task.assignedCleaner && (
                    <span className="ml-2 text-foreground">· {task.assignedCleaner.fullName}</span>
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
