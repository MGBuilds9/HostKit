"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { ChecklistSection } from "./turnover/checklist-section";
import { ImageUpload } from "@/components/ui/image-upload";

interface ChecklistItem {
  label: string;
  type: "check" | "restock" | "deep_clean" | "monthly";
}

interface ChecklistSectionData {
  title: string;
  items: ChecklistItem[];
}

interface ChecklistTemplate {
  id: string;
  name: string;
  sections: ChecklistSectionData[];
}

export function TurnoverChecklist({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [showDeepClean, setShowDeepClean] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/properties/${propertyId}/checklist`)
      .then((r) => { if (!r.ok) throw new Error("No checklist template found"); return r.json(); })
      .then(setTemplate)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [propertyId]);

  const { totalItems, checkedCount } = useMemo(() => {
    if (!template) return { totalItems: 0, checkedCount: 0 };
    let total = 0, done = 0;
    for (const section of template.sections) {
      for (const item of section.items) {
        if (!showDeepClean && item.type === "deep_clean") continue;
        total++;
        if (checked[`${section.title}:${item.label}`]) done++;
      }
    }
    return { totalItems: total, checkedCount: done };
  }, [template, checked, showDeepClean]);

  function toggleItem(sectionTitle: string, label: string) {
    const key = `${sectionTitle}:${label}`;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleComplete() {
    setSaving(true);
    const checklistData = template?.sections.map((section) => ({
      title: section.title,
      items: section.items.map((item) => ({
        ...item,
        completed: !!checked[`${section.title}:${item.label}`],
      })),
    }));
    await fetch(`/api/properties/${propertyId}/turnovers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklistData, notes, photos }),
    });
    router.push(`/admin/properties/${propertyId}/turnovers`);
    router.refresh();
  }

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!template) return <p className="text-muted-foreground">No checklist template available.</p>;

  const progressPercent = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  return (
    <div className="space-y-4 pb-24 md:pb-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">{template.name}</h2>
          <span className="text-sm text-muted-foreground">{checkedCount} of {totalItems} done</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={showDeepClean} onCheckedChange={setShowDeepClean} />
          <Label className="text-sm cursor-pointer" onClick={() => setShowDeepClean(!showDeepClean)}>
            Include deep clean items
          </Label>
        </div>
      </div>

      {template.sections.map((section) => (
        <ChecklistSection
          key={section.title}
          title={section.title}
          items={section.items}
          checked={checked}
          showDeepClean={showDeepClean}
          onToggle={toggleItem}
        />
      ))}

      <div>
        <Label htmlFor="turnover-notes">Notes</Label>
        <Textarea
          id="turnover-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any issues, restocking notes, etc."
          className="mt-1"
        />
      </div>

      <div className="space-y-2">
        <Label>Photos</Label>
        <p className="text-xs text-muted-foreground">Attach photos of the completed turnover.</p>
        <ImageUpload
          onUpload={(url) => {
            if (url) setPhotos((prev) => [...prev, url]);
          }}
        />
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {photos.map((url, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${i + 1}`} className="h-16 w-16 rounded object-cover border" />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs hidden group-hover:flex items-center justify-center"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 p-4 bg-background border-t md:static md:border-0 md:p-0 md:bg-transparent z-30">
        <Button
          onClick={handleComplete}
          disabled={saving || checkedCount === 0}
          className="w-full h-14 md:h-10 md:w-auto text-base md:text-sm"
        >
          {saving ? "Saving..." : "Mark Turnover Complete"}
        </Button>
      </div>
    </div>
  );
}
