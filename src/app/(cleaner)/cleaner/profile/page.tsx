"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LogOut, Mail, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PushSubscribeButton } from "@/components/push-subscribe-button";

interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

interface CleanerRecord {
  id: string;
  notificationPreferences: NotificationPreferences | null;
}

export default function CleanerProfilePage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [cleaner, setCleaner] = useState<CleanerRecord | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    emailEnabled: true,
    pushEnabled: true,
    quietHoursStart: "",
    quietHoursEnd: "",
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/cleaners/me")
      .then((r) => r.ok ? r.json() : null)
      .then((data: CleanerRecord | null) => {
        if (data) {
          setCleaner(data);
          setPrefs({
            emailEnabled: data.notificationPreferences?.emailEnabled ?? true,
            pushEnabled: data.notificationPreferences?.pushEnabled ?? true,
            quietHoursStart: data.notificationPreferences?.quietHoursStart ?? "",
            quietHoursEnd: data.notificationPreferences?.quietHoursEnd ?? "",
          });
        }
      })
      .catch(() => null);
  }, [status]);

  async function savePrefs() {
    if (!cleaner) return;
    setSavingPrefs(true);
    try {
      const res = await fetch(`/api/cleaners/${cleaner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationPreferences: {
            emailEnabled: prefs.emailEnabled,
            pushEnabled: prefs.pushEnabled,
            quietHoursStart: prefs.quietHoursStart || undefined,
            quietHoursEnd: prefs.quietHoursEnd || undefined,
          },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Preferences saved" });
    } catch {
      toast({ title: "Error", description: "Could not save preferences.", variant: "destructive" });
    } finally {
      setSavingPrefs(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Profile</h1>

      {/* User Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user?.image ?? undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-lg leading-tight truncate">
                {user?.name ?? "Cleaner"}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{user?.email ?? "—"}</span>
              </p>
              <span className="inline-flex items-center mt-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 capitalize">
                {user?.role ?? "cleaner"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="emailEnabled" className="text-sm">Email notifications</Label>
            <Switch
              id="emailEnabled"
              checked={prefs.emailEnabled}
              onCheckedChange={(checked) => setPrefs((p) => ({ ...p, emailEnabled: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="pushEnabled" className="text-sm">Push notifications</Label>
            <Switch
              id="pushEnabled"
              checked={prefs.pushEnabled}
              onCheckedChange={(checked) => setPrefs((p) => ({ ...p, pushEnabled: checked }))}
            />
          </div>
          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-muted-foreground">Quiet hours (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="quietStart" className="text-xs">Start</Label>
                <Input
                  id="quietStart"
                  type="time"
                  value={prefs.quietHoursStart ?? ""}
                  onChange={(e) => setPrefs((p) => ({ ...p, quietHoursStart: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="quietEnd" className="text-xs">End</Label>
                <Input
                  id="quietEnd"
                  type="time"
                  value={prefs.quietHoursEnd ?? ""}
                  onChange={(e) => setPrefs((p) => ({ ...p, quietHoursEnd: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={savePrefs}
            disabled={savingPrefs || !cleaner}
            className="w-full"
          >
            {savingPrefs ? "Saving…" : "Save Preferences"}
          </Button>
          {!cleaner && (
            <p className="text-xs text-muted-foreground text-center">
              Loading your profile…
            </p>
          )}
          <div className="pt-1 border-t">
            <p className="text-xs text-muted-foreground mb-2">Browser push notifications</p>
            <PushSubscribeButton />
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Button
        variant="outline"
        className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>

      <p className="text-center text-xs text-muted-foreground pt-2">
        HostKit &mdash; Cleaner Portal
      </p>
    </div>
  );
}
