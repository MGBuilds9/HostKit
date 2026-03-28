"use client";

import { SprayCan } from "lucide-react";
import { TaskCard, type TaskCardTask } from "@/components/cleaner/task-card";

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
      <h1 className="text-xl font-semibold mb-4">
        Today&apos;s Tasks
        {tasks.length > 0 && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({tasks.length})
          </span>
        )}
      </h1>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <SprayCan className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-medium text-muted-foreground">No tasks today</p>
          <p className="text-sm text-muted-foreground">Enjoy your day off!</p>
        </div>
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
