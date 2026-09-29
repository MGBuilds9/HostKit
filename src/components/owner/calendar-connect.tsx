"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CalendarDays } from "lucide-react";

interface CalendarEntry {
  id: string;
  summary: string;
  primary: boolean;
}

export function OwnerCalendarConnect({
  propertyId,
  googleCalendarId,
  connectedEmail,
  lastSyncStatus,
  lastSyncError,
}: {
  propertyId: string;
  googleCalendarId: string | null;
  connectedEmail: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
}) {
  const router = useRouter();
  const [calendars, setCalendars] = useState<CalendarEntry[] | null>(null);
  const [selected, setSelected] = useState(googleCalendarId ?? "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);

  function reconnect() {
    const callbackUrl = window.location.pathname + window.location.search;
    void signIn("google", { callbackUrl }, { prompt: "consent", access_type: "offline" });
  }

  async function loadCalendars() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/me/calendars");
      const body = await res.json().catch(() => ({}));
      const authFailed =
        res.status === 409 ||
        body.error === "google_auth_failed" ||
        (res.status === 502 && Boolean(body.reconnectUrl));
      if (authFailed) {
        setNeedsReconnect(true);
        setError(body.message ?? "Reconnect Google to list calendars.");
        return;
      }
      if (res.status === 503 || body.error === "google_list_failed") {
        setNeedsReconnect(false);
        setError(body.message ?? "Google is temporarily unavailable. Try again shortly.");
        return;
      }
      if (!res.ok) {
        setNeedsReconnect(false);
        setError("Could not load calendars.");
        return;
      }
      setNeedsReconnect(false);
      setCalendars(body.calendars ?? []);
    } catch {
      setNeedsReconnect(false);
      setError("Network error while loading calendars. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  async function connect() {
    if (!selected) {
      setError("Pick a calendar first.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/calendar-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleCalendarId: selected }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setError("Google did not grant a refresh token. Reconnect and approve calendar access.");
        return;
      }
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : "Could not connect the calendar.");
        return;
      }

      const syncRes = await fetch(`/api/properties/${propertyId}/sync`, { method: "POST" });
      const syncBody = await syncRes.json().catch(() => ({}));
      if (!syncRes.ok) {
        setMessage("Calendar saved. The first sync did not finish; it will retry on the next run.");
      } else if (Array.isArray(syncBody.errors) && syncBody.errors.length > 0) {
        setMessage(syncBody.errors.join(" "));
      } else if (typeof syncBody.synced === "number") {
        setMessage(
          `Connected. ${syncBody.synced} ${syncBody.synced === 1 ? "stay" : "stays"} read from the calendar.`
        );
      } else {
        setMessage("Calendar connected.");
      }
      router.refresh();
    } catch {
      setError("Network error while connecting the calendar.");
    } finally {
      setSaving(false);
    }
  }

  const syncNeedsReconnect =
    lastSyncStatus === "error" &&
    !!lastSyncError &&
    !/temporary Google token refresh/i.test(lastSyncError);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          {connectedEmail
            ? `Sync uses ${connectedEmail}.`
            : "Connect the Google account that owns this property's calendar."}
          {googleCalendarId ? ` Current calendar: ${googleCalendarId}` : ""}
        </p>
        {lastSyncStatus === "error" && lastSyncError && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {lastSyncError}
          </p>
        )}

        {calendars === null ? (
          <Button type="button" variant="outline" onClick={loadCalendars} disabled={loading}>
            {loading ? "Loading calendars…" : "Choose a calendar"}
          </Button>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="owner-calendar">Calendar</Label>
            <select
              id="owner-calendar"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="flex h-12 md:h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Pick a calendar</option>
              {calendars.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.summary}
                  {calendar.primary ? " (primary)" : ""}
                </option>
              ))}
            </select>
            <Button type="button" onClick={connect} disabled={saving}>
              {saving ? "Connecting…" : "Connect this calendar"}
            </Button>
          </div>
        )}

        {(needsReconnect || syncNeedsReconnect) && (
          <Button type="button" variant="outline" onClick={reconnect}>
            Reconnect Google
          </Button>
        )}
        {error && !needsReconnect && (
          <Button type="button" variant="outline" onClick={loadCalendars} disabled={loading}>
            Try again
          </Button>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
