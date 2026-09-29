"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const editSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof editSchema>;

interface UserActionsProps {
  userId: string;
  name: string | null;
  email: string;
  phone: string | null;
  isActive: boolean;
  isSelf: boolean;
  isLastActiveAdmin: boolean;
}

export function UserActions({
  userId,
  name,
  email,
  phone,
  isActive,
  isSelf,
  isLastActiveAdmin,
}: UserActionsProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: name ?? "", phone: phone ?? "" },
  });

  async function onSubmit(data: FormValues) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
        }),
      });

      if (res.ok) {
        setEditOpen(false);
        toast({ title: "User updated" });
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        const msg =
          typeof json?.error === "string"
            ? json.error
            : json?.error?.formErrors?.[0] ?? "Failed to update user.";
        setError("root", { message: msg });
      }
    } catch {
      setError("root", { message: "Network error. Please try again." });
    }
  }

  async function handleToggleActive() {
    setToggling(true);

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (res.ok) {
        toast({ title: isActive ? "User deactivated" : "User activated" });
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        const msg =
          typeof json?.error === "string"
            ? json.error
            : json?.error?.formErrors?.[0] ?? "Failed to update user.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    } catch {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });

      if (res.ok) {
        setDeleteOpen(false);
        toast({ title: "User deleted" });
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        const msg =
          typeof json?.error === "string"
            ? json.error
            : json?.error?.formErrors?.[0] ?? "Failed to delete user.";
        setDeleteError(msg);
      }
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const toggleBlocked = isSelf || (isActive && isLastActiveAdmin);
  const toggleBlockedReason = isSelf
    ? "You cannot deactivate your own account."
    : isActive && isLastActiveAdmin
      ? "You cannot deactivate the last admin."
      : null;

  return (
    <div className="flex items-center gap-3">
      {/* Edit */}
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        Edit
      </Button>

      {/* Active/Inactive toggle */}
      <div className="flex items-center gap-2" title={toggleBlockedReason ?? undefined}>
        <Switch
          id={`active-${userId}`}
          checked={isActive}
          onCheckedChange={handleToggleActive}
          disabled={toggling || toggleBlocked}
        />
        <Label htmlFor={`active-${userId}`} className="text-xs text-muted-foreground w-14">
          {isActive ? "Active" : "Inactive"}
        </Label>
      </div>

      {/* Delete */}
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setDeleteOpen(true)}
        disabled={isSelf}
        title={isSelf ? "You cannot delete your own account." : undefined}
      >
        Delete
      </Button>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" autoComplete="name" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} disabled />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed here — it is tied to the sign-in account.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" {...register("phone")} />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              Permanently delete {name ?? email}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
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
              {deleting ? "Deleting…" : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
