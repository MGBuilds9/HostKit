"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Wifi,
  Car,
  Clock,
  User,
  CheckSquare,
  Square,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

type TaskStatus =
  | "pending"
  | "offered"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

interface ChecklistItem {
  label: string;
  type: "check" | "restock" | "deep_clean" | "monthly";
  checked?: boolean;
}

interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

interface TaskDetail {
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

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  offered: { label: "Offered", className: "bg-blue-100 text-blue-800" },
  accepted: { label: "Accepted", className: "bg-green-100 text-green-800" },
  in_progress: { label: "In Progress", className: "bg-purple-100 text-purple-800" },
  completed: { label: "Completed", className: "bg-gray-100 text-gray-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800" },
};

function getStatusActions(
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

export default function CleanerTaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [checklist, setChecklist] = useState<ChecklistSection[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);

  const fetchTask = useCallback(async () => {
    try {
      // Fetch via calendar endpoint scoped to cleaner — we use the cleaning-tasks approach
      // Since there's no dedicated GET /api/cleaning-tasks/[id] for cleaners, we load
      // a 30-day window and find the matching task by id
      const today = new Date();
      today.setDate(today.getDate() - 7);
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);

      const res = await fetch(
        `/api/calendar?from=${encodeURIComponent(today.toISOString())}&to=${encodeURIComponent(in30.toISOString())}`
      );
      if (!res.ok) throw new Error("Failed to load task");

      const data: Array<{
        property: TaskDetail["property"];
        stays: Array<{
          guestName?: string | null;
          startDate: string;
          endDate: string;
          cleaningTasks: Array<{
            id: string;
            status: TaskStatus;
            scheduledStart: string;
            scheduledEnd: string;
            triggerType?: string | null;
            notes?: string | null;
            checklistData?: ChecklistSection[] | null;
            completedAt?: string | null;
            assignedCleaner?: { fullName: string } | null;
          }>;
        }>;
      }> = await res.json();

      let found: TaskDetail | null = null;
      for (const entry of data) {
        for (const stay of entry.stays) {
          for (const t of stay.cleaningTasks) {
            if (t.id === taskId) {
              found = {
                ...t,
                property: entry.property,
                stay: {
                  guestName: stay.guestName,
                  startDate: stay.startDate,
                  endDate: stay.endDate,
                },
              };
              break;
            }
          }
          if (found) break;
        }
        if (found) break;
      }

      if (!found) throw new Error("Task not found");

      setTask(found);
      setNotes(found.notes ?? "");
      setChecklist(found.checklistData ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  async function handleStatusChange(newStatus: TaskStatus) {
    if (newStatus === "completed" && !confirmComplete) {
      setConfirmComplete(true);
      return;
    }

    setTransitioning(true);
    setConfirmComplete(false);
    try {
      const res = await fetch(`/api/cleaning-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      const updated = await res.json();
      setTask((prev) => prev ? { ...prev, status: updated.status } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setTransitioning(false);
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    try {
      const res = await fetch(`/api/cleaning-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to save notes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notes");
    } finally {
      setSaving(false);
    }
  }

  function toggleChecklistItem(sectionIdx: number, itemIdx: number) {
    setChecklist((prev) => {
      const updated = prev.map((section, si) => ({
        ...section,
        items: section.items.map((item, ii) =>
          si === sectionIdx && ii === itemIdx
            ? { ...item, checked: !item.checked }
            : item
        ),
      }));
      return updated;
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="font-medium">{error || "Task not found"}</p>
        <Button variant="outline" asChild>
          <Link href="/cleaner">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const config = statusConfig[task.status];
  const actions = getStatusActions(task.status);
  const isTerminal = task.status === "completed" || task.status === "cancelled";

  const startTime = new Date(task.scheduledStart).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = new Date(task.scheduledEnd).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateLabel = new Date(task.scheduledStart).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const totalItems = checklist.reduce((sum, s) => sum + s.items.length, 0);
  const checkedItems = checklist.reduce(
    (sum, s) => sum + s.items.filter((i) => i.checked).length,
    0
  );

  return (
    <div className="space-y-4 pb-6">
      {/* Back nav */}
      <Link
        href="/cleaner"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              config.className
            )}
          >
            {config.label}
          </span>
          {task.triggerType && (
            <span className="text-xs text-muted-foreground capitalize">
              {task.triggerType} clean
            </span>
          )}
        </div>
        <h1 className="text-xl font-semibold">{task.property.name}</h1>
        <p className="text-sm text-muted-foreground">
          {task.property.addressStreet}, {task.property.addressCity},{" "}
          {task.property.addressProvince}
        </p>
      </div>

      {/* Schedule */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium">{dateLabel}</p>
              <p className="text-muted-foreground">
                {startTime} – {endTime}
              </p>
            </div>
          </div>

          {task.stay?.guestName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <p>Guest: {task.stay.guestName}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access Info */}
      {(task.property.wifiName || task.property.parkingSpot) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Access Info</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {task.property.wifiName && (
              <div className="flex items-start gap-2 text-sm">
                <Wifi className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{task.property.wifiName}</p>
                  {task.property.wifiPassword && (
                    <p className="text-muted-foreground font-mono text-xs">
                      {task.property.wifiPassword}
                    </p>
                  )}
                </div>
              </div>
            )}
            {task.property.parkingSpot && (
              <div className="flex items-start gap-2 text-sm">
                <Car className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Parking: {task.property.parkingSpot}</p>
                  {task.property.parkingInstructions && (
                    <p className="text-muted-foreground text-xs">
                      {task.property.parkingInstructions}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Checklist */}
      {checklist.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Checklist</CardTitle>
              <span className="text-xs text-muted-foreground">
                {checkedItems} / {totalItems}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width: totalItems > 0 ? `${(checkedItems / totalItems) * 100}%` : "0%",
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            {checklist.map((section, si) => (
              <div key={si}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {section.title}
                </p>
                <div className="space-y-2">
                  {section.items.map((item, ii) => (
                    <button
                      key={ii}
                      onClick={() => toggleChecklistItem(si, ii)}
                      className={cn(
                        "flex items-start gap-2.5 w-full text-left text-sm rounded-md p-2 transition-colors",
                        item.checked
                          ? "text-muted-foreground line-through"
                          : "text-foreground hover:bg-accent"
                      )}
                    >
                      {item.checked ? (
                        <CheckSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {!isTerminal && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this cleaning task..."
              className="min-h-[80px] resize-none"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveNotes}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Notes"}
            </Button>
          </CardContent>
        </Card>
      )}

      {task.notes && isTerminal && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Status Actions */}
      {!isTerminal && actions.length > 0 && (
        <div className="space-y-2 pt-2">
          {confirmComplete ? (
            <div className="space-y-2">
              <p className="text-sm text-center text-muted-foreground">
                Mark this task as complete?
              </p>
              <Button
                className="w-full"
                onClick={() => handleStatusChange("completed")}
                disabled={transitioning}
              >
                {transitioning ? "Completing..." : "Yes, Mark Complete"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setConfirmComplete(false)}
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
                onClick={() => handleStatusChange(action.nextStatus)}
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
            task.status === "completed"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          )}
        >
          {task.status === "completed"
            ? `Completed${task.completedAt ? " " + new Date(task.completedAt).toLocaleDateString() : ""}`
            : "This task was cancelled"}
        </div>
      )}
    </div>
  );
}
