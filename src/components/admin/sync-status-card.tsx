"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SyncStatusCardProps {
  propertyId: string;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export function SyncStatusCard({
  propertyId,
  lastSyncAt,
  lastSyncStatus,
  lastSyncError,
}: SyncStatusCardProps) {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [localStatus, setLocalStatus] = useState(lastSyncStatus);
  const [localError, setLocalError] = useState(lastSyncError);
  const [localSyncAt, setLocalSyncAt] = useState(lastSyncAt);

  async function handleSyncNow() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/sync`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? `Sync failed: ${res.status}`);
      }
      setLocalStatus("ok");
      setLocalError(null);
      setLocalSyncAt(new Date().toISOString());
      toast({ title: "Sync complete", description: "Calendar synced successfully." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setLocalStatus("error");
      setLocalError(msg);
      toast({ title: "Sync failed", description: msg, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  function statusBadge() {
    if (!localSyncAt) {
      return (
        <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100 flex items-center gap-1">
          <Clock className="h-3 w-3" /> Never synced
        </Badge>
      );
    }
    if (localStatus === "ok") {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> OK
        </Badge>
      );
    }
    if (localStatus === "error") {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Error
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" /> Unknown
      </Badge>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Calendar Sync</CardTitle>
          {statusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          {localSyncAt ? (
            <>
              Last synced:{" "}
              <span className="text-foreground font-medium">{timeAgo(localSyncAt)}</span>
              <span className="text-xs ml-2 text-muted-foreground">
                (
                {new Date(localSyncAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                )
              </span>
            </>
          ) : (
            <span>No sync has run yet.</span>
          )}
        </div>

        {localStatus === "error" && localError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {localError}
          </div>
        )}

        <Button
          onClick={handleSyncNow}
          disabled={syncing}
          variant="outline"
          size="sm"
          className={cn("h-12 w-full md:h-9 md:w-auto", syncing && "opacity-70")}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>
      </CardContent>
    </Card>
  );
}
