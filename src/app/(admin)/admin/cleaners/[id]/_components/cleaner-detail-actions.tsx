"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

interface CleanerDetailActionsProps {
  cleanerId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  notificationPreferences: NotificationPreferences | null;
}

const editSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  emailEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
});

type FormValues = z.infer<typeof editSchema>;

export function CleanerDetailActions({
  cleanerId,
  fullName,
  email,
  phone,
  isActive,
  notificationPreferences,
}: CleanerDetailActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      fullName,
      email: email ?? "",
      phone: phone ?? "",
      emailEnabled: notificationPreferences?.emailEnabled ?? true,
      pushEnabled: notificationPreferences?.pushEnabled ?? true,
      quietHoursStart: notificationPreferences?.quietHoursStart ?? "",
      quietHoursEnd: notificationPreferences?.quietHoursEnd ?? "",
    },
  });

  async function onSubmit(data: FormValues) {
    try {
      const res = await fetch(`/api/cleaners/${cleanerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.fullName,
          email: data.email || undefined,
          phone: data.phone || undefined,
          notificationPreferences: {
            emailEnabled: data.emailEnabled,
            pushEnabled: data.pushEnabled,
            quietHoursStart: data.quietHoursStart || undefined,
            quietHoursEnd: data.quietHoursEnd || undefined,
          },
        }),
      });

      if (res.ok) {
        setOpen(false);
        toast({ title: "Cleaner updated" });
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        const msg =
          typeof json?.error === "string"
            ? json.error
            : json?.error?.formErrors?.[0] ?? "Failed to update cleaner.";
        setError("root", { message: msg });
      }
    } catch {
      setError("root", { message: "Network error. Please try again." });
    }
  }

  async function handleToggleActive() {
    setToggling(true);

    try {
      const res = await fetch(`/api/cleaners/${cleanerId}`, {
        method: isActive ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: isActive ? undefined : JSON.stringify({ isActive: true }),
      });

      if (res.ok) {
        toast({ title: isActive ? "Cleaner deactivated" : "Cleaner reactivated" });
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        toast({
          title: "Error",
          description:
            typeof json?.error === "string"
              ? json.error
              : "Failed to update status.",
          variant: "destructive",
        });
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

  return (
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cleaner</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" {...register("fullName")} />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-3 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">
                Notification Preferences
              </p>
              <div className="flex items-center justify-between">
                <Label htmlFor="emailEnabled" className="text-sm">
                  Email notifications
                </Label>
                <Switch
                  id="emailEnabled"
                  checked={watch("emailEnabled")}
                  onCheckedChange={(checked) => setValue("emailEnabled", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="pushEnabled" className="text-sm">
                  Push notifications
                </Label>
                <Switch
                  id="pushEnabled"
                  checked={watch("pushEnabled")}
                  onCheckedChange={(checked) => setValue("pushEnabled", checked)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="quietStart" className="text-xs">
                    Quiet hours start
                  </Label>
                  <Input
                    id="quietStart"
                    type="time"
                    {...register("quietHoursStart")}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="quietEnd" className="text-xs">
                    Quiet hours end
                  </Label>
                  <Input
                    id="quietEnd"
                    type="time"
                    {...register("quietHoursEnd")}
                  />
                </div>
              </div>
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

      <Button
        variant={isActive ? "destructive" : "outline"}
        size="sm"
        onClick={handleToggleActive}
        disabled={toggling}
      >
        {toggling ? "Saving…" : isActive ? "Deactivate" : "Reactivate"}
      </Button>
    </div>
  );
}
