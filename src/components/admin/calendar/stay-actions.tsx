"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import type { Stay } from "./calendar-utils";

const editSchema = z
  .object({
    guestName: z.string().optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    status: z.enum(["booked", "blocked", "cancelled"]),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

type EditValues = z.infer<typeof editSchema>;

function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface StayActionsProps {
  propertyId: string;
  stay: Stay;
}

export function StayActions({ propertyId, stay }: StayActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EditValues | "root", string>>>({});
  const [values, setValues] = useState<EditValues>({
    guestName: stay.guestName ?? "",
    startDate: toDateTimeLocal(stay.startDate),
    endDate: toDateTimeLocal(stay.endDate),
    status: stay.status,
  });

  function openEdit() {
    setValues({
      guestName: stay.guestName ?? "",
      startDate: toDateTimeLocal(stay.startDate),
      endDate: toDateTimeLocal(stay.endDate),
      status: stay.status,
    });
    setErrors({});
    setEditOpen(true);
  }

  function handleChange<K extends keyof EditValues>(key: K, val: EditValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = editSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof EditValues;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/stays/${stay.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: result.data.guestName || null,
          startDate: new Date(result.data.startDate).toISOString(),
          endDate: new Date(result.data.endDate).toISOString(),
          status: result.data.status,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = (err as { error?: string }).error ?? "Failed to update stay";
        toast({ title: "Error", description: msg, variant: "destructive" });
        return;
      }

      toast({ title: "Stay updated", description: "The stay has been updated." });
      setEditOpen(false);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/stays/${stay.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = (err as { error?: string }).error ?? "Failed to delete stay";
        toast({ title: "Error", description: msg, variant: "destructive" });
        return;
      }

      toast({ title: "Stay deleted", description: "The stay and its cleaning tasks were removed." });
      setDeleteOpen(false);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={openEdit}
        aria-label="Edit stay"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
        aria-label="Delete stay"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Stay</DialogTitle>
            <DialogDescription>
              Update the stay details. Editing marks the stay as manual so the iCal sync will not
              overwrite it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {errors.root && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                {errors.root}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor={`guestName-${stay.id}`}>Guest Name</Label>
              <Input
                id={`guestName-${stay.id}`}
                placeholder="Jane Smith"
                value={values.guestName}
                onChange={(e) => handleChange("guestName", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor={`startDate-${stay.id}`}>Start</Label>
                <Input
                  id={`startDate-${stay.id}`}
                  type="datetime-local"
                  value={values.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                />
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor={`endDate-${stay.id}`}>End</Label>
                <Input
                  id={`endDate-${stay.id}`}
                  type="datetime-local"
                  value={values.endDate}
                  onChange={(e) => handleChange("endDate", e.target.value)}
                />
                {errors.endDate && <p className="text-xs text-destructive">{errors.endDate}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor={`status-${stay.id}`}>Status</Label>
              <select
                id={`status-${stay.id}`}
                value={values.status}
                onChange={(e) => handleChange("status", e.target.value as EditValues["status"])}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="booked">Booked</option>
                <option value="blocked">Blocked</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Stay</DialogTitle>
            <DialogDescription>
              This will permanently delete this stay and cancel any linked cleaning tasks. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete Stay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
