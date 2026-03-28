"use client";

import { CalendarDays } from "lucide-react";
import { TaskCard, type TaskCardTask } from "@/components/cleaner/task-card";

type TaskStatus =
  | "pending"
  | "offered"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

interface UpcomingTaskListProps {
  tasks: TaskCardTask[];
  grouped: Map<string, TaskCardTask[]>;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

export function UpcomingTaskList({ tasks, grouped, onStatusChange }: UpcomingTaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarDays className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="font-medium text-muted-foreground">No upcoming tasks</p>
        <p className="text-sm text-muted-foreground">
          You&apos;re all clear for the next 14 days
        </p>
      </div>
    );
  }

  return (
    <>
      {Array.from(grouped.entries()).map(([dateLabel, dateTasks]) => (
        <section key={dateLabel}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {dateLabel}
          </h2>
          <div className="space-y-3">
            {dateTasks.map((task) => (
              <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
