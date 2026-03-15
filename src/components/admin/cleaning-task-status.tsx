"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type TaskStatus = "pending" | "offered" | "accepted" | "in_progress" | "completed" | "cancelled";

interface CleaningTask {
  id: string;
  status: TaskStatus;
  assignedCleanerId: string | null;
  notes: string | null;
}

interface Cleaner {
  id: string;
  fullName: string;
}

interface CleaningTaskStatusProps {
  task: CleaningTask;
  cleaners: Cleaner[];
  onUpdate: () => void;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  offered: "Offered",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function CleaningTaskStatus({ task, cleaners, onUpdate }: CleaningTaskStatusProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [assignedCleanerId, setAssignedCleanerId] = useState<string>(
    task.assignedCleanerId ?? "unassigned"
  );
  const [notes, setNotes] = useState<string>(task.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/cleaning-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          assignedCleanerId: assignedCleanerId === "unassigned" ? null : assignedCleanerId,
          notes,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Request failed: ${res.status}`);
      }

      toast({ title: "Task updated", description: "Cleaning task has been updated." });
      onUpdate();
    } catch (e: unknown) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`status-${task.id}`}>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as TaskStatus)}
          >
            <SelectTrigger id={`status-${task.id}`} className="h-12 md:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor={`cleaner-${task.id}`}>Assigned Cleaner</Label>
          <Select
            value={assignedCleanerId}
            onValueChange={setAssignedCleanerId}
          >
            <SelectTrigger id={`cleaner-${task.id}`} className="h-12 md:h-10">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {cleaners.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`notes-${task.id}`}>Notes</Label>
        <Textarea
          id={`notes-${task.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this cleaning task..."
          rows={2}
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        size="sm"
        className="h-12 w-full md:h-9 md:w-auto"
      >
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
