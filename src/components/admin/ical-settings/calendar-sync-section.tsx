"use client";

import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CalendarDays } from "lucide-react";
import { CombinedValues } from "./types";

interface CalendarSyncSectionProps {
  register: UseFormRegister<CombinedValues>;
  setValue: UseFormSetValue<CombinedValues>;
  errors: FieldErrors<CombinedValues>;
  icalSyncEnabled: boolean;
  syncIntervalMinutes: number;
}

export function CalendarSyncSection({
  register,
  setValue,
  errors,
  icalSyncEnabled,
  syncIntervalMinutes,
}: CalendarSyncSectionProps) {
  return (
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
  );
}
