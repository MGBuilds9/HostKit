"use client";

import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type TaskStatus, getStatusActions } from "./task-types";

interface TaskActionsProps {
  status: TaskStatus;
  completedAt?: string | null;
  transitioning: boolean;
  confirmComplete: boolean;
  error: string | null;
  onStatusChange: (newStatus: TaskStatus) => void;
  onSetConfirmComplete: (value: boolean) => void;
}

export function TaskActions({
  status,
  completedAt,
  transitioning,
  confirmComplete,
  error,
  onStatusChange,
  onSetConfirmComplete,
}: TaskActionsProps) {
  const isTerminal = status === "completed" || status === "cancelled";
  const actions = getStatusActions(status);

  return (
    <>
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!isTerminal && actions.length > 0 && (
        <div className="space-y-2 pt-2">
          {confirmComplete ? (
            <div className="space-y-2">
              <p className="text-sm text-center text-muted-foreground">
                Mark this task as complete?
              </p>
              <Button
                className="w-full"
                onClick={() => onStatusChange("completed")}
                disabled={transitioning}
              >
                {transitioning ? "Completing..." : "Yes, Mark Complete"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onSetConfirmComplete(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            actions.map((action) => (
              <Button
                key={action.nextStatus}
                className="w-full"
                variant={action.variant}
                onClick={() => onStatusChange(action.nextStatus)}
                disabled={transitioning}
              >
                {transitioning ? "Updating..." : action.label}
              </Button>
            ))
          )}
        </div>
      )}

      {isTerminal && (
        <div
          className={cn(
            "text-center p-4 rounded-lg text-sm font-medium",
            status === "completed" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          )}
        >
          {status === "completed"
            ? `Completed${completedAt ? " " + new Date(completedAt).toLocaleDateString() : ""}`
            : "This task was cancelled"}
        </div>
      )}
    </>
  );
}
