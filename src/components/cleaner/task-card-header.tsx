"use client";

import Link from "next/link";
import { Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type TaskStatus =
  | "pending"
  | "offered"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

const statusConfig: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  offered: { label: "Offered", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  accepted: { label: "Accepted", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  in_progress: { label: "In Progress", className: "bg-purple-100 text-purple-800 hover:bg-purple-100" },
  completed: { label: "Completed", className: "bg-gray-100 text-gray-700 hover:bg-gray-100" },
  cancelled: { label: "Cancelled", className: "" },
};

interface TaskCardHeaderProps {
  taskId: string;
  propertyName: string;
  status: TaskStatus;
  triggerType?: string | null;
  startTime: string;
  endTime: string;
  guestName?: string | null;
}

export function TaskCardHeader({
  taskId,
  propertyName,
  status,
  triggerType,
  startTime,
  endTime,
  guestName,
}: TaskCardHeaderProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-start justify-between gap-3 w-full">
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
          {triggerType && (
            <span className="text-xs text-muted-foreground capitalize">{triggerType}</span>
          )}
        </div>
        <Link href={`/cleaner/tasks/${taskId}`}>
          <p className="font-semibold text-foreground leading-tight hover:underline truncate">
            {propertyName}
          </p>
        </Link>
        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{startTime} – {endTime}</span>
        </div>
        {guestName && (
          <p className="text-xs text-muted-foreground mt-0.5">Guest: {guestName}</p>
        )}
      </div>
      <Link
        href={`/cleaner/tasks/${taskId}`}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
