"use client";

import { TaskCard, type TaskCardTask } from "@/components/cleaner/task-card";

type TaskStatus =
  | "pending"
  | "offered"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

interface StatsSummaryProps {
  tasks: TaskCardTask[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

export function StatsSummary({ tasks, onStatusChange }: StatsSummaryProps) {
  if (tasks.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">
        Upcoming
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          (next 7 days)
        </span>
      </h2>
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} />
        ))}
      </div>
    </section>
  );
}
