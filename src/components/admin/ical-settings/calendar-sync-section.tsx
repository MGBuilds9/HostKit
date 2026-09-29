"use client";

import { useState } from "react";
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CalendarDays, Loader2, Link2, TriangleAlert, Unplug } from "lucide-react";
import { signIn } from "next-auth/react";
import { CombinedValues } from "./types";

interface CalendarEntry {
  id: string;
  summary: string;
  primary: boolean;
}

interface CalendarSyncSectionProps {
  register: UseFormRegister<CombinedValues>;
  setValue: UseFormSetValue<CombinedValues>;
  errors: FieldErrors<CombinedValues>;
  icalSyncEnabled: boolean;
  syncIntervalMinutes: number;
  googleCalendarId: string;
  /**
   * Parent reads this at submit time. When true and the property has a
   * Google Calendar selected, the parent additionally POSTs
   * /api/properties/{id}/calendar-connection to point calendarConnectedByUserId
   * at the current user.
   */
  useMyAccount: boolean;
  onUseMyAccountChange: (checked: boolean) => void;
  /** Set when the property is already connected to someone's Google account. */
  currentConnectedEmail?: string | null;
  /** Current DB value of calendarConnectedByUserId, for showing "reconnect". */
  calendarConnectedByUserId?: string | null;
}

type CalendarsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; calendars: CalendarEntry[] }
  | { status: "no_account" } // 409 no_google_account
  | { status: "auth_failed"; message: string } // 502 google_auth_failed
  | { status: "transient"; message: string }; // 503 refresh blip — do not reconnect

export function CalendarSyncSection({
  register,
  setValue,
  errors,
  icalSyncEnabled,
  syncIntervalMinutes,
  googleCalendarId,
  useMyAccount,
  onUseMyAccountChange,
  currentConnectedEmail,
  calendarConnectedByUserId,
}: CalendarSyncSectionProps) {
  const [calendarsState, setCalendarsState] = useState<CalendarsState>({ status: "idle" });

  function reconnectGoogle() {
    const callbackUrl = window.location.pathname + window.location.search;
    void signIn("google", { callbackUrl }, { prompt: "consent", access_type: "offline" });
  }

  async function handleConnect() {
    setCalendarsState({ status: "loading" });
    try {
      const res = await fetch("/api/me/calendars");
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        if (body?.error === "google_auth_failed") {
          setCalendarsState({
            status: "auth_failed",
            message: body?.message ?? "Google rejected the session.",
          });
        } else {
          setCalendarsState({ status: "no_account" });
        }
        return;
      }
      if (res.status === 502) {
        const body = await res.json().catch(() => ({}));
        if (body?.error === "google_auth_failed" || body?.reconnectUrl) {
          setCalendarsState({
            status: "auth_failed",
            message: body?.message ?? "Google rejected the session.",
          });
        } else {
          setCalendarsState({
            status: "transient",
            message: body?.message ?? "Could not list calendars. Try again shortly.",
          });
        }
        return;
      }
      if (res.status === 503) {
        const body = await res.json().catch(() => ({}));
        setCalendarsState({
          status: "transient",
          message: body?.message ?? "Google is temporarily unavailable. Try again shortly.",
        });
        return;
      }
      if (!res.ok) {
        setCalendarsState({
          status: "auth_failed",
          message: `Failed to fetch calendars (${res.status}).`,
        });
        return;
      }
      const body = await res.json();
      setCalendarsState({ status: "ready", calendars: body.calendars ?? [] });
    } catch {
      setCalendarsState({
        status: "transient",
        message: "Network error while fetching calendars. Try again shortly.",
      });
    }
  }

  const isConnected = !!calendarConnectedByUserId;

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

        {/* ── Google Calendar picker (CONNECT-CALENDAR UX) ──────────── */}
        <div className="space-y-2">
          <Label>Google Calendar</Label>

          {(calendarsState.status === "idle" || calendarsState.status === "loading") && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleConnect}
                disabled={calendarsState.status === "loading"}
                className="h-12 md:h-9"
              >
                {calendarsState.status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading calendars…
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Connect Google Calendar
                  </>
                )}
              </Button>
              {isConnected && (
                <span className="text-xs text-muted-foreground">
                  Currently connected{currentConnectedEmail ? ` as ${currentConnectedEmail}` : ""}.
                </span>
              )}
            </div>
          )}

          {calendarsState.status === "ready" && (
            <div className="space-y-2">
              <Select
                value={googleCalendarId}
                onValueChange={(v) => setValue("googleCalendarId", v)}
              >
                <SelectTrigger id="googleCalendarId" className="h-12 md:h-10">
                  <SelectValue placeholder="Pick a calendar" />
                </SelectTrigger>
                <SelectContent>
                  {calendarsState.calendars.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.summary}
                      {c.primary ? " (primary)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.googleCalendarId && (
                <p className="text-xs text-destructive">{errors.googleCalendarId.message}</p>
              )}
            </div>
          )}

          {calendarsState.status === "no_account" && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-2">
              <div className="flex items-start gap-2">
                <TriangleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>Sign in with Google, then come back to connect a calendar.</div>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={reconnectGoogle}>
                Sign in with Google
              </Button>
            </div>
          )}

          {calendarsState.status === "auth_failed" && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive space-y-2">
              <div className="flex items-start gap-2">
                <TriangleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>{calendarsState.message}</div>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={reconnectGoogle}>
                Reconnect with Google
              </Button>
            </div>
          )}

          {calendarsState.status === "transient" && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-2">
              <div>{calendarsState.message}</div>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleConnect}>
                Try again
              </Button>
            </div>
          )}

          {/* Connected-account opt-in checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="useMyAccount"
              checked={useMyAccount}
              onChange={(e) => onUseMyAccountChange(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <Label htmlFor="useMyAccount" className="text-xs font-normal cursor-pointer">
              Use my account to sync this calendar
            </Label>
          </div>

          {/* Subtle reconnect affordance when already connected */}
          {isConnected && calendarsState.status === "idle" && (
            <div className="pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleConnect}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Unplug className="h-3 w-3 mr-1" />
                Reconnect to a different account
              </Button>
            </div>
          )}

          {/* Manual-ID escape hatch */}
          <Accordion type="single" collapsible className="border-0">
            <AccordionItem value="manual" className="border-0">
              <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline">
                Enter calendar ID manually
              </AccordionTrigger>
              <AccordionContent className="pb-0">
                <div className="space-y-1">
                  <Label htmlFor="googleCalendarId" className="text-xs">
                    Google Calendar ID
                  </Label>
                  <Input
                    id="googleCalendarId"
                    placeholder="example@group.calendar.google.com"
                    {...register("googleCalendarId")}
                    className="h-12 md:h-10"
                  />
                  {errors.googleCalendarId && calendarsState.status !== "ready" && (
                    <p className="text-xs text-destructive">{errors.googleCalendarId.message}</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
