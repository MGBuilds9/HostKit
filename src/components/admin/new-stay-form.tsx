"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const formSchema = z
  .object({
    guestName: z.string().optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    source: z.enum(["airbnb", "google", "manual"]),
    status: z.enum(["booked", "blocked", "cancelled"]),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

type FormValues = z.infer<typeof formSchema>;

interface NewStayFormProps {
  propertyId: string;
}

export function NewStayForm({ propertyId }: NewStayFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [values, setValues] = useState<FormValues>({
    guestName: "",
    startDate: "",
    endDate: "",
    source: "manual",
    status: "booked",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues | "root", string>>>({});
  const [saving, setSaving] = useState(false);

  function handleChange<K extends keyof FormValues>(key: K, val: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = formSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormValues;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/stays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: result.data.guestName || undefined,
          startDate: result.data.startDate,
          endDate: result.data.endDate,
          source: result.data.source,
          status: result.data.status,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = (err as { error?: string }).error ?? "Failed to create stay";
        if (res.status === 409) {
          setErrors({ root: msg });
        } else {
          toast({ title: "Error", description: msg, variant: "destructive" });
        }
        return;
      }

      toast({ title: "Stay created", description: "The stay has been added to the calendar." });
      router.push(`/admin/properties/${propertyId}`);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {errors.root && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {errors.root}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="guestName">Guest Name</Label>
        <Input
          id="guestName"
          placeholder="Jane Smith"
          value={values.guestName}
          onChange={(e) => handleChange("guestName", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={values.startDate}
            onChange={(e) => handleChange("startDate", e.target.value)}
          />
          {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={values.endDate}
            onChange={(e) => handleChange("endDate", e.target.value)}
          />
          {errors.endDate && <p className="text-xs text-destructive">{errors.endDate}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="source">Source</Label>
        <select
          id="source"
          value={values.source}
          onChange={(e) => handleChange("source", e.target.value as FormValues["source"])}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="manual">Manual</option>
          <option value="airbnb">Airbnb</option>
          <option value="google">Google</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          value={values.status}
          onChange={(e) => handleChange("status", e.target.value as FormValues["status"])}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="booked">Booked</option>
          <option value="blocked">Blocked</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Creating…" : "Create Stay"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
