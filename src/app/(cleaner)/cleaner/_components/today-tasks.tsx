"use client";

import { SprayCan } from "lucide-react";
import { TaskCard, type TaskCardTask } from "@/components/cleaner/task-card";
import { EmptyState } from "@/components/ui/empty-state";

type TaskStatus =
  | "pending"
  | "offered"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

interface TodayTasksProps {
  tasks: TaskCardTask[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

export function TodayTasks({ tasks, onStatusChange }: TodayTasksProps) {
  return (
    <section>
      <h1 className="mb-4 flex items-baseline gap-2 text-xl font-semibold">
        Today&apos;s Tasks
        {tasks.length > 0 && (
          <span className="text-sm font-normal text-muted-foreground">
            ({tasks.length})
          </span>
        )}
      </h1>

      {tasks.length === 0 ? (
        <EmptyState
          dashed
          icon={SprayCan}
          title="No tasks today"
          description="Enjoy your day off!"
          className="py-14"
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} />
          ))}
        </div>
      )}
    </section>
  );
}
