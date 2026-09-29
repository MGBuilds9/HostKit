"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";

type InviteRole = "owner" | "manager" | "cleaner";

interface InviteRow {
  id: string;
  email: string;
  intendedRole: InviteRole;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

function statusOf(invite: InviteRow): string {
  if (invite.revokedAt) return "Revoked";
  if (invite.acceptedAt) return "Accepted";
  if (new Date(invite.expiresAt).getTime() < Date.now()) return "Expired";
  return "Pending";
}

export function PropertyInvites({
  propertyId,
  ownerId,
}: {
  propertyId: string;
  ownerId: string;
}) {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("owner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ propertyId, ownerId });
    const res = await fetch(`/api/admin/invites?${params.toString()}`);
    if (!res.ok) {
      setError("Could not load invites.");
      return;
    }
    const rows = (await res.json()) as InviteRow[];
    setInvites(rows);
  }, [propertyId, ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreatedUrl(null);
    const body: Record<string, string> = { email, intendedRole: role };
    if (role === "owner") body.ownerId = ownerId;
    if (role === "manager" || role === "cleaner") body.propertyId = propertyId;

    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Invite was not created.");
        return;
      }
      if (typeof payload.url === "string") setCreatedUrl(payload.url);
      setEmail("");
      await load();
    } catch {
      setError("Network error while creating the invite.");
    } finally {
      setBusy(false);
    }
  }

  async function mutate(id: string, action: "resend" | "revoke") {
    setError(null);
    const res = await fetch(`/api/admin/invites/${id}/${action}`, { method: "POST" });
    if (!res.ok) {
      setError(action === "resend" ? "Could not resend." : "Could not revoke.");
      return;
    }
    await load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Mail className="h-4 w-4" /> Invites
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Owner links this property&apos;s owner profile. Manager grants the admin
          portal for every property, not only this one. The person signs in with
          Google and accepts the link themselves.
        </p>

        <form onSubmit={onCreate} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="h-12 md:h-10"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as InviteRole)}
              className="flex h-12 md:h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="cleaner">Cleaner</option>
            </select>
          </div>
          <Button type="submit" disabled={busy} className="h-12 md:h-10">
            {busy ? "Sending…" : "Send invite"}
          </Button>
        </form>

        {createdUrl && (
          <div className="space-y-1">
            <Label htmlFor="invite-url">Accept link</Label>
            <Input id="invite-url" readOnly value={createdUrl} className="h-12 md:h-10 font-mono text-xs" />
            <p className="text-xs text-muted-foreground">
              Shown once in case email is not configured. It is not written to the server log.
            </p>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <ul className="space-y-2">
          {invites.length === 0 && (
            <li className="text-xs text-muted-foreground">No invites for this property yet.</li>
          )}
          {invites.map((invite) => {
            const status = statusOf(invite);
            const pending = status === "Pending";
            return (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{invite.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {invite.intendedRole} · {status}
                  </p>
                </div>
                {pending && (
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => mutate(invite.id, "resend")}>
                      Resend
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => mutate(invite.id, "revoke")}>
                      Revoke
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
