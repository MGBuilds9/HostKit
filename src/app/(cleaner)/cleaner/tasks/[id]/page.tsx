"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { TaskHeader } from "./_components/task-header";
import { TaskChecklist } from "./_components/task-checklist";
import { TaskNotesEditable, TaskNotesReadonly } from "./_components/task-notes";
import { TaskActions } from "./_components/task-actions";
import { type TaskDetail, type TaskStatus, type ChecklistSection } from "./_components/task-types";

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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/cleaning-tasks/${taskId}`);
      if (!res.ok) throw new Error("Failed to load task");
      const data: TaskDetail = await res.json();
      setTask(data);
      setNotes(data.notes ?? "");
      setChecklist(data.checklistData ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => { fetchTask(); }, [fetchTask]);

  async function handleStatusChange(newStatus: TaskStatus) {
    if (newStatus === "completed" && !confirmComplete) { setConfirmComplete(true); return; }
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

  async function saveChecklist(data: ChecklistSection[]) {
    setSaveStatus("saving");
    try {
      await fetch(`/api/cleaning-tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checklistData: data }) });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch { setSaveStatus("idle"); }
  }

  function toggleChecklistItem(sectionIdx: number, itemIdx: number) {
    setChecklist((prev) => {
      const updated = prev.map((section, si) => ({
        ...section,
        items: section.items.map((item, ii) =>
          si === sectionIdx && ii === itemIdx ? { ...item, checked: !item.checked } : item
        ),
      }));
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveChecklist(updated), 500);
      return updated;
    });
  }

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );

  if (error || !task) return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <p className="font-medium">{error || "Task not found"}</p>
      <Button variant="outline" asChild><Link href="/cleaner">Back to Dashboard</Link></Button>
    </div>
  );

  const isTerminal = task.status === "completed" || task.status === "cancelled";

  return (
    <div className="space-y-4 pb-6">
      <Link href="/cleaner" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        Back
      </Link>
      <TaskHeader task={task} />
      <TaskChecklist checklist={checklist} saveStatus={saveStatus} onToggleItem={toggleChecklistItem} />
      {!isTerminal && (
        <TaskNotesEditable notes={notes} saving={saving} onChange={setNotes} onSave={handleSaveNotes} />
      )}
      {isTerminal && <TaskNotesReadonly notes={task.notes ?? ""} />}
      <TaskActions
        status={task.status}
        completedAt={task.completedAt}
        transitioning={transitioning}
        confirmComplete={confirmComplete}
        error={error}
        onStatusChange={handleStatusChange}
        onSetConfirmComplete={setConfirmComplete}
      />
    </div>
  );
}
