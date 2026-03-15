"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { icalSettingsSchema, turnoverRulesSchema } from "@/lib/validators";
import { CalendarDays, Settings2 } from "lucide-react";

const combinedSchema = icalSettingsSchema.merge(turnoverRulesSchema);
type CombinedValues = z.infer<typeof combinedSchema>;

interface Cleaner {
  id: string;
  fullName: string;
}

const COMMON_TIMEZONES = [
  "America/Toronto",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Vancouver",
  "America/Halifax",
  "America/St_Johns",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CombinedValues>({
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

  const icalSyncEnabled = watch("icalSyncEnabled");
  const sameDayTurnAllowed = watch("sameDayTurnAllowed");
  const cleanOn = watch("cleanOn");
  const syncIntervalMinutes = watch("syncIntervalMinutes");
  const timezone = watch("timezone");
  const defaultCleanerId = watch("defaultCleanerId");

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
      {/* Calendar Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Calendar Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="icalSyncEnabled"
              checked={icalSyncEnabled}
              onCheckedChange={(v) => setValue("icalSyncEnabled", v)}
            />
            <Label htmlFor="icalSyncEnabled">Enable iCal sync</Label>
          </div>

          <div className="space-y-1">
            <Label htmlFor="airbnbIcalUrl">Airbnb iCal URL</Label>
            <Input
              id="airbnbIcalUrl"
              type="url"
              placeholder="https://www.airbnb.com/calendar/ical/..."
              {...register("airbnbIcalUrl")}
              className="h-12 md:h-10"
            />
            {errors.airbnbIcalUrl && (
              <p className="text-xs text-destructive">{errors.airbnbIcalUrl.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="googleCalendarId">Google Calendar ID</Label>
            <Input
              id="googleCalendarId"
              placeholder="example@group.calendar.google.com"
              {...register("googleCalendarId")}
              className="h-12 md:h-10"
            />
            {errors.googleCalendarId && (
              <p className="text-xs text-destructive">{errors.googleCalendarId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="syncIntervalMinutes">Sync interval</Label>
            <Select
              value={String(syncIntervalMinutes)}
              onValueChange={(v) => setValue("syncIntervalMinutes", Number(v))}
            >
              <SelectTrigger id="syncIntervalMinutes" className="h-12 md:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Every 5 minutes</SelectItem>
                <SelectItem value="10">Every 10 minutes</SelectItem>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
                <SelectItem value="60">Every hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Turnover Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Turnover Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cleanOn">Clean on</Label>
            <Select
              value={cleanOn}
              onValueChange={(v) => setValue("cleanOn", v as "checkout" | "checkin" | "both")}
            >
              <SelectTrigger id="cleanOn" className="h-12 md:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checkout">Checkout day</SelectItem>
                <SelectItem value="checkin">Check-in day</SelectItem>
                <SelectItem value="both">Both checkout and check-in</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="cleanStartOffsetHours">Start offset (hours after checkout)</Label>
              <Input
                id="cleanStartOffsetHours"
                type="number"
                min={0}
                max={24}
                {...register("cleanStartOffsetHours", { valueAsNumber: true })}
                className="h-12 md:h-10"
              />
              {errors.cleanStartOffsetHours && (
                <p className="text-xs text-destructive">{errors.cleanStartOffsetHours.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="cleanDurationHours">Duration (hours)</Label>
              <Input
                id="cleanDurationHours"
                type="number"
                min={1}
                max={12}
                {...register("cleanDurationHours", { valueAsNumber: true })}
                className="h-12 md:h-10"
              />
              {errors.cleanDurationHours && (
                <p className="text-xs text-destructive">{errors.cleanDurationHours.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="sameDayTurnAllowed"
              checked={sameDayTurnAllowed}
              onCheckedChange={(v) => setValue("sameDayTurnAllowed", v)}
            />
            <Label htmlFor="sameDayTurnAllowed">Allow same-day turnovers</Label>
          </div>

          <div className="space-y-1">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={timezone}
              onValueChange={(v) => setValue("timezone", v)}
            >
              <SelectTrigger id="timezone" className="h-12 md:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="defaultCleanerId">Default cleaner</Label>
            <Select
              value={defaultCleanerId ?? ""}
              onValueChange={(v) => setValue("defaultCleanerId", v === "none" ? "" : v)}
            >
              <SelectTrigger id="defaultCleanerId" className="h-12 md:h-10">
                <SelectValue placeholder="None (unassigned)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (unassigned)</SelectItem>
                {cleaners.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving} className="w-full md:w-auto h-12 md:h-10">
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}
