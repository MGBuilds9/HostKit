"use client";

import { CalendarDays } from "lucide-react";
import { TaskCard, type TaskCardTask } from "@/components/cleaner/task-card";
import { EmptyState } from "@/components/ui/empty-state";

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
      <EmptyState
        dashed
        icon={CalendarDays}
        title="No upcoming tasks"
        description="You're all clear for the next 14 days"
        className="py-16"
      />
    );
  }

  return (
    <>
      {Array.from(grouped.entries()).map(([dateLabel, dateTasks]) => (
        <section key={dateLabel}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
