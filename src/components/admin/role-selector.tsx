"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = ["admin", "owner", "manager", "cleaner"] as const;

interface RoleSelectorProps {
  userId: string;
  currentRole: string;
}

export function RoleSelector({ userId, currentRole }: RoleSelectorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value;
    if (newRole === currentRole) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setError(data?.error?.formErrors?.[0] ?? data?.error ?? "Failed to update role");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        defaultValue={currentRole}
        onChange={handleChange}
        disabled={loading}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </option>
        ))}
      </select>
      {loading && <span className="text-xs text-muted-foreground">Saving…</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
