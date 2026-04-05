"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const TIMEZONES = [
  "America/Toronto",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Vancouver",
  "America/Edmonton",
  "America/Winnipeg",
  "America/Halifax",
  "America/St_Johns",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
  "UTC",
];

interface SettingsValues {
  companyName: string;
  defaultTimezone: string;
  defaultCleaningDurationHours: string;
}

export function AppSettingsForm() {
  const { toast } = useToast();
  const [values, setValues] = useState<SettingsValues>({
    companyName: "",
    defaultTimezone: "America/Toronto",
    defaultCleaningDurationHours: "3",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : {})
      .then((data: Record<string, string | null>) => {
        setValues({
          companyName: data.companyName ?? "",
          defaultTimezone: data.defaultTimezone ?? "America/Toronto",
          defaultCleaningDurationHours: data.defaultCleaningDurationHours ?? "3",
        });
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const hours = parseInt(values.defaultCleaningDurationHours, 10);
    if (isNaN(hours) || hours < 1 || hours > 24) {
      toast({
        title: "Invalid value",
        description: "Cleaning duration must be between 1 and 24 hours.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          { key: "companyName", value: values.companyName || null },
          { key: "defaultTimezone", value: values.defaultTimezone },
          { key: "defaultCleaningDurationHours", value: String(hours) },
        ]),
      });

      if (!res.ok) {
        throw new Error("Save failed");
      }

      toast({ title: "Settings saved" });
    } catch {
      toast({ title: "Error", description: "Could not save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <Label htmlFor="companyName">Company Name</Label>
        <Input
          id="companyName"
          placeholder="MKG Builds"
          value={values.companyName}
          onChange={(e) => setValues((v) => ({ ...v, companyName: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="defaultTimezone">Default Timezone</Label>
        <select
          id="defaultTimezone"
          value={values.defaultTimezone}
          onChange={(e) => setValues((v) => ({ ...v, defaultTimezone: e.target.value }))}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="cleaningDuration">Default Cleaning Duration (hours)</Label>
        <Input
          id="cleaningDuration"
          type="number"
          min={1}
          max={24}
          value={values.defaultCleaningDurationHours}
          onChange={(e) => setValues((v) => ({ ...v, defaultCleaningDurationHours: e.target.value }))}
        />
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save Settings"}
      </Button>
    </form>
  );
}
