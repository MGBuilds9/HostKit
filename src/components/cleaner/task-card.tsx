"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock, ChevronRight } from "lucide-react";

type TaskStatus =
  | "pending"
  | "offered"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface TaskCardTask {
  id: string;
  propertyName: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: TaskStatus;
  guestName?: string | null;
  triggerType?: string | null;
}

interface TaskCardProps {
  task: TaskCardTask;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

const statusConfig: Record<
  TaskStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className: string }
> = {
  pending: {
    label: "Pending",
    variant: "secondary",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  offered: {
    label: "Offered",
    variant: "secondary",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  accepted: {
    label: "Accepted",
    variant: "secondary",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  in_progress: {
    label: "In Progress",
    variant: "secondary",
    className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  },
  completed: {
    label: "Completed",
    variant: "secondary",
    className: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive",
    className: "",
  },
};

function getNextAction(
  status: TaskStatus
): { label: string; nextStatus: TaskStatus } | null {
  switch (status) {
    case "pending":
    case "offered":
      return { label: "Accept", nextStatus: "accepted" };
    case "accepted":
      return { label: "Start", nextStatus: "in_progress" };
    case "in_progress":
      return { label: "Complete", nextStatus: "completed" };
    default:
      return null;
  }
}

export function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const [loading, setLoading] = useState(false);

  const startTime = new Date(task.scheduledStart).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = new Date(task.scheduledEnd).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const config = statusConfig[task.status];
  const nextAction = getNextAction(task.status);

  async function handleAction() {
    if (!nextAction || loading) return;
    setLoading(true);
    try {
      await onStatusChange(task.id, nextAction.nextStatus);
    } finally {
      setLoading(false);
    }
  }

  const isTerminal = task.status === "completed" || task.status === "cancelled";

  return (
    <Card className={cn("transition-shadow", isTerminal && "opacity-70")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  config.className || "bg-gray-100 text-gray-700"
                )}
              >
                {config.label}
              </span>
              {task.triggerType && (
                <span className="text-xs text-muted-foreground capitalize">
                  {task.triggerType}
                </span>
              )}
            </div>

            <Link href={`/cleaner/tasks/${task.id}`}>
              <p className="font-semibold text-foreground leading-tight hover:underline truncate">
                {task.propertyName}
              </p>
            </Link>

            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>
                {startTime} – {endTime}
              </span>
            </div>

            {task.guestName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Guest: {task.guestName}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <Link
              href={`/cleaner/tasks/${task.id}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>

            {nextAction && (
              <Button
                size="sm"
                variant={nextAction.nextStatus === "completed" ? "default" : "outline"}
                onClick={handleAction}
                disabled={loading}
                className="text-xs h-7 px-3"
              >
                {loading ? "..." : nextAction.label}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
