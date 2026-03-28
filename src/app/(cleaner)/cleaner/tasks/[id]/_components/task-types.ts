export type TaskStatus =
  | "pending"
  | "offered"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface ChecklistItem {
  label: string;
  type: "check" | "restock" | "deep_clean" | "monthly";
  checked?: boolean;
}

export interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

export interface TaskDetail {
  id: string;
  status: TaskStatus;
  scheduledStart: string;
  scheduledEnd: string;
  triggerType?: string | null;
  notes?: string | null;
  checklistData?: ChecklistSection[] | null;
  completedAt?: string | null;
  property: {
    name: string;
    addressStreet: string;
    addressCity: string;
    addressProvince: string;
    wifiName?: string | null;
    wifiPassword?: string | null;
    parkingSpot?: string | null;
    parkingInstructions?: string | null;
  };
  stay?: {
    guestName?: string | null;
    startDate: string;
    endDate: string;
  } | null;
  assignedCleaner?: { fullName: string } | null;
}

export const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  offered: { label: "Offered", className: "bg-blue-100 text-blue-800" },
  accepted: { label: "Accepted", className: "bg-green-100 text-green-800" },
  in_progress: { label: "In Progress", className: "bg-purple-100 text-purple-800" },
  completed: { label: "Completed", className: "bg-gray-100 text-gray-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800" },
};

export function getStatusActions(
  status: TaskStatus
): Array<{ label: string; nextStatus: TaskStatus; variant: "default" | "outline" }> {
  switch (status) {
    case "pending":
    case "offered":
      return [{ label: "Accept Task", nextStatus: "accepted", variant: "default" }];
    case "accepted":
      return [{ label: "Start Cleaning", nextStatus: "in_progress", variant: "default" }];
    case "in_progress":
      return [{ label: "Mark Complete", nextStatus: "completed", variant: "default" }];
    default:
      return [];
  }
}
