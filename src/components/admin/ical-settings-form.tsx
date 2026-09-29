"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { combinedSchema, CombinedValues, Cleaner } from "./ical-settings/types";
import { CalendarSyncSection } from "./ical-settings/calendar-sync-section";
import { TurnoverRulesSection } from "./ical-settings/turnover-rules-section";

interface IcalSettingsFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  property: any;
  /** Email of the user whose Google account currently drives the sync. */
  calendarConnectedByEmail?: string | null;
  /** Caller role — drives role-specific UX down the tree. */
  currentUserRole?: "admin" | "owner" | "manager" | "cleaner";
}

export function IcalSettingsForm({
  property,
  calendarConnectedByEmail,
  currentUserRole,
}: IcalSettingsFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [useMyAccount, setUseMyAccount] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/cleaners")
      .then((r) => (r.ok ? r.json() : []))
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

      // ── CONNECT-CALENDAR: pin caller as the sync account ──────────────
      if (useMyAccount && data.googleCalendarId) {
        const connRes = await fetch(`/api/properties/${property.id}/calendar-connection`, {
          method: "POST",
        });
        if (connRes.status === 409) {
          toast({
            title: "Settings saved, but reconnect required",
            description:
              "Sign in with Google again so we can keep syncing the calendar.",
            variant: "destructive",
          });
          return;
        }
        if (!connRes.ok) {
          const body = await connRes.json().catch(() => ({}));
          throw new Error(body?.error ?? `connection failed: ${connRes.status}`);
        }

        // Kick off an immediate sync so the user sees stays pulled in now
        // instead of waiting for the next cron tick. Fire-and-forget toast
        // once the SyncResult resolves.
        fetch(`/api/properties/${property.id}/sync`, { method: "POST" })
          .then(async (r) => {
            const body = await r.json().catch(() => ({}));
            if (r.ok && typeof body?.synced === "number") {
              toast({
                title: `Connected — ${body.synced} ${
                  body.synced === 1 ? "stay" : "stays"
                } pulled`,
              });
            }
          })
          .catch(() => {
            /* ignore — cron will pick it up */
          });
      }

      toast({
        title: "Settings saved",
        description: "Calendar sync and turnover rules updated.",
      });
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
        googleCalendarId={watch("googleCalendarId") ?? ""}
        useMyAccount={useMyAccount}
        onUseMyAccountChange={setUseMyAccount}
        currentConnectedEmail={calendarConnectedByEmail}
        calendarConnectedByUserId={property.calendarConnectedByUserId ?? null}
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
      {/* Role visibility only — admin/manager can edit; for owner/cleaner the
          server component hides the form and shows read-only state instead. */}
      {currentUserRole !== "cleaner" && (
        <Button type="submit" disabled={saving} className="w-full md:w-auto h-12 md:h-10">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      )}
    </form>
  );
}
