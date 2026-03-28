"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CleaningTaskStatus } from "@/components/admin/cleaning-task-status";
import { SprayCan, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type TaskStatus = "pending" | "offered" | "accepted" | "in_progress" | "completed" | "cancelled";
const STATUS_LABELS: Record<TaskStatus, string> = { pending: "Pending", offered: "Offered", accepted: "Accepted", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled" };

export interface CleaningTask {
  id: string; status: TaskStatus; scheduledStart: string; scheduledEnd: string;
  assignedCleanerId: string | null; assignedCleaner?: { fullName: string } | null;
  notes: string | null; propertyId: string; property?: { name: string } | null;
  stayId: string | null; stay?: { guestName: string | null } | null;
}
export interface Cleaner { id: string; fullName: string; }

interface TaskTableProps { tasks: CleaningTask[]; cleaners: Cleaner[]; loading: boolean; error: string | null; onUpdate: () => void; }

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

export function TaskTable({ tasks, cleaners, loading, error, onUpdate }: TaskTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <SprayCan className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No cleaning tasks in this period</p>
      </div>
    );
  }

  const dateFmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });

  return (
    <>
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
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{dateFmt(task.scheduledStart)}</td>
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
                    <CleaningTaskStatus task={task} cleaners={cleaners} onUpdate={onUpdate} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-medium">
                    {task.property?.name ?? "Unknown property"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dateFmt(task.scheduledStart)}
                    {task.stay?.guestName && ` · Guest: ${task.stay.guestName}`}
                  </p>
                </div>
                {taskStatusBadge(task.status)}
              </div>
            </CardHeader>
            <CardContent>
              <CleaningTaskStatus task={task} cleaners={cleaners} onUpdate={onUpdate} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
