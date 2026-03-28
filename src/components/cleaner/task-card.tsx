"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TaskCardHeader } from "./task-card-header";

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

  const nextAction = getNextAction(task.status);
  const isTerminal = task.status === "completed" || task.status === "cancelled";

  async function handleAction() {
    if (!nextAction || loading) return;
    setLoading(true);
    try {
      await onStatusChange(task.id, nextAction.nextStatus);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={cn("transition-shadow", isTerminal && "opacity-70")}>
      <CardContent className="p-4">
        <TaskCardHeader
          taskId={task.id}
          propertyName={task.propertyName}
          status={task.status}
          triggerType={task.triggerType}
          startTime={startTime}
          endTime={endTime}
          guestName={task.guestName}
        />
        {nextAction && (
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              variant={nextAction.nextStatus === "completed" ? "default" : "outline"}
              onClick={handleAction}
              disabled={loading}
              className="text-xs h-7 px-3"
            >
              {loading ? "..." : nextAction.label}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
