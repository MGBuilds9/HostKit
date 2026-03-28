"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UsePropertyFormReturn {
  saveTab: (tabKey: string, data: Record<string, unknown>) => Promise<boolean>;
  saving: boolean;
  lastSavedTab: string | null;
  propertyId: string | undefined;
}

export function usePropertyForm(
  initialPropertyId: string | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _initialData: Record<string, unknown>
): UsePropertyFormReturn {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [lastSavedTab, setLastSavedTab] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string | undefined>(initialPropertyId);

  async function saveTab(tabKey: string, data: Record<string, unknown>): Promise<boolean> {
    setSaving(true);
    try {
      let res: Response;
      if (propertyId) {
        res = await fetch(`/api/properties/${propertyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        res = await fetch("/api/properties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }

      if (!res.ok) {
        console.error(`Save failed for tab ${tabKey}:`, await res.text());
        return false;
      }

      const result = await res.json();

      // On first save (POST), capture the new propertyId
      if (!propertyId && result?.id) {
        setPropertyId(result.id);
        router.replace(`/admin/properties/${result.id}/edit`);
      }

      setLastSavedTab(tabKey);
      router.refresh();
      return true;
    } catch (err) {
      console.error(`Save error for tab ${tabKey}:`, err);
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { saveTab, saving, lastSavedTab, propertyId };
}
