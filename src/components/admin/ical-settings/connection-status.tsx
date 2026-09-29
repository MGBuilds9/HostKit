import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, CircleSlash, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  /** Pointer on the property row (null → not connected). */
  calendarConnectedByUserId: string | null;
  /** Email of that connected user (null until server resolves it). */
  connectedEmail: string | null;
  /** True when the connected user no longer has a google accounts row. */
  connectedUserHasGoogleAccount: boolean;
  /** Aggregate count of stays pulled from the calendar source. */
  staysSyncedCount: number;
  /** From properties.lastSyncAt (ISO). */
  lastSyncAt: string | null;
  /** From properties.lastSyncStatus ("ok" | "error" | null). */
  lastSyncStatus: string | null;
  /** From properties.lastSyncError. */
  lastSyncError: string | null;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

const ERROR_PREVIEW_LEN = 120;

/**
 * Read-only card summarizing the current calendar-connection state.
 * Rendered by the property settings page with data from the server query.
 */
export function ConnectionStatus({
  calendarConnectedByUserId,
  connectedEmail,
  connectedUserHasGoogleAccount,
  staysSyncedCount,
  lastSyncAt,
  lastSyncStatus,
  lastSyncError,
}: ConnectionStatusProps) {
  const connected = !!calendarConnectedByUserId;
  const dangling = connected && !connectedUserHasGoogleAccount;
  const hasError = connected && lastSyncStatus === "error" && !!lastSyncError;

  const truncatedError =
    lastSyncError && lastSyncError.length > ERROR_PREVIEW_LEN
      ? `${lastSyncError.slice(0, ERROR_PREVIEW_LEN)}…`
      : lastSyncError;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Connection</CardTitle>
          {!connected && (
            <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100 flex items-center gap-1">
              <CircleSlash className="h-3 w-3" /> Not connected
            </Badge>
          )}
          {connected && dangling && (
            <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Dangling pointer
            </Badge>
          )}
          {connected && !dangling && hasError && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Error
            </Badge>
          )}
          {connected && !dangling && !hasError && (
            <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {!connected && (
          <p className="text-muted-foreground">
            No calendar account connected. Pick a Google Calendar below to start
            syncing stays.
          </p>
        )}

        {connected && (
          <div className="text-muted-foreground">
            Connected as{" "}
            <span className={cn("font-medium", dangling ? "text-destructive" : "text-foreground")}>
              {connectedEmail ?? "unknown"}
            </span>
            {!dangling && (
              <>
                {" "}
                · {staysSyncedCount}{" "}
                {staysSyncedCount === 1 ? "stay" : "stays"} synced
              </>
            )}
            {lastSyncAt && (
              <>
                {" "}
                · last run <span className="text-foreground font-medium">{timeAgo(lastSyncAt)}</span>
              </>
            )}
          </div>
        )}

        {hasError && !dangling && (
          <div
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
            title={lastSyncError ?? undefined}
          >
            {truncatedError}
          </div>
        )}

        {dangling && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            The connected account no longer has a Google grant. Disconnect and
            reconnect the calendar to a Google-backed sign-in.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
