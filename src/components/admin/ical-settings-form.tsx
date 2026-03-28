"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { combinedSchema, CombinedValues, Cleaner } from "./ical-settings/types";
import { CalendarSyncSection } from "./ical-settings/calendar-sync-section";
import { TurnoverRulesSection } from "./ical-settings/turnover-rules-section";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function IcalSettingsForm({ property }: { property: any }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);

  useEffect(() => {
    fetch("/api/cleaners")
      .then((r) => r.ok ? r.json() : [])
      .then(setCleaners)
      .catch(() => setCleaners([]));
  }, []);

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<CombinedValues>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(combinedSchema) as any,
      defaultValues: {
        airbnbIcalUrl: property.airbnbIcalUrl ?? "",
        googleCalendarId: property.googleCalendarId ?? "",
        icalSyncEnabled: property.icalSyncEnabled ?? false,
        syncIntervalMinutes: property.syncIntervalMinutes ?? 15,
        cleanOn: property.cleanOn ?? "checkout",
        cleanStartOffsetHours: property.cleanStartOffsetHours ?? 0,
        cleanDurationHours: property.cleanDurationHours ?? 3,
        defaultCleanerId: property.defaultCleanerId ?? "",
        sameDayTurnAllowed: property.sameDayTurnAllowed ?? false,
        timezone: property.timezone ?? "America/Toronto",
      },
    });

  async function onSubmit(data: CombinedValues) {
    setSaving(true);
    try {
      const res = await fetch(`/api/properties/${property.id}/ical-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Request failed: ${res.status}`);
      }
      toast({ title: "Settings saved", description: "Calendar sync and turnover rules updated." });
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <CalendarSyncSection
        register={register}
        setValue={setValue}
        errors={errors}
        icalSyncEnabled={watch("icalSyncEnabled")}
        syncIntervalMinutes={watch("syncIntervalMinutes")}
      />
      <TurnoverRulesSection
        register={register}
        setValue={setValue}
        errors={errors}
        cleanOn={watch("cleanOn")}
        sameDayTurnAllowed={watch("sameDayTurnAllowed")}
        timezone={watch("timezone")}
        defaultCleanerId={watch("defaultCleanerId")}
        cleaners={cleaners}
      />
      <Button type="submit" disabled={saving} className="w-full md:w-auto h-12 md:h-10">
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}
