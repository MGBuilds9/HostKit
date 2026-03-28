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
import { Settings2 } from "lucide-react";
import { CombinedValues, COMMON_TIMEZONES, Cleaner } from "./types";

interface TurnoverRulesSectionProps {
  register: UseFormRegister<CombinedValues>;
  setValue: UseFormSetValue<CombinedValues>;
  errors: FieldErrors<CombinedValues>;
  cleanOn: string;
  sameDayTurnAllowed: boolean;
  timezone: string;
  defaultCleanerId?: string;
  cleaners: Cleaner[];
}

export function TurnoverRulesSection({
  register,
  setValue,
  errors,
  cleanOn,
  sameDayTurnAllowed,
  timezone,
  defaultCleanerId,
  cleaners,
}: TurnoverRulesSectionProps) {
  return (
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
          <Select value={timezone} onValueChange={(v) => setValue("timezone", v)}>
            <SelectTrigger id="timezone" className="h-12 md:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
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
                <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
