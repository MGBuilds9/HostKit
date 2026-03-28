export interface CleaningTask {
  id: string;
  status: "pending" | "offered" | "accepted" | "in_progress" | "completed" | "cancelled";
  scheduledStart: string;
  scheduledEnd: string;
  assignedCleaner?: { fullName: string } | null;
}

export interface Stay {
  id: string;
  guestName: string | null;
  status: "booked" | "blocked" | "cancelled";
  startDate: string;
  endDate: string;
  cleaningTasks: CleaningTask[];
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export const TASK_STATUS_CLASSES: Record<CleaningTask["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
  offered: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
  accepted: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
  completed: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
  cancelled: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
};

export const TASK_STATUS_LABELS: Record<CleaningTask["status"], string> = {
  pending: "Pending",
  offered: "Offered",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
