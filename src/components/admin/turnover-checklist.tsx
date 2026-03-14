"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

interface ChecklistItem {
  label: string;
  type: "check" | "restock" | "deep_clean" | "monthly";
}

interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

interface ChecklistTemplate {
  id: string;
  name: string;
  sections: ChecklistSection[];
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

  useEffect(() => {
    fetch(`/api/properties/${propertyId}/checklist`)
      .then((r) => {
        if (!r.ok) throw new Error("No checklist template found");
        return r.json();
      })
      .then(setTemplate)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [propertyId]);

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
      body: JSON.stringify({ checklistData, notes }),
    });

    router.push(`/admin/properties/${propertyId}/turnovers`);
    router.refresh();
  }

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!template) return <p className="text-muted-foreground">No checklist template available.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">{template.name}</h2>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showDeepClean}
            onChange={() => setShowDeepClean(!showDeepClean)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Include deep clean items
        </label>
      </div>

      {template.sections.map((section) => {
        const visibleItems = section.items.filter(
          (item) => showDeepClean || item.type !== "deep_clean"
        );
        if (visibleItems.length === 0) return null;

        return (
          <Card key={section.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {visibleItems.map((item) => {
                const key = `${section.title}:${item.label}`;
                return (
                  <label key={key} className="flex items-center gap-3 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!checked[key]}
                      onChange={() => toggleItem(section.title, item.label)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="text-sm">{item.label}</span>
                    {item.type === "restock" && (
                      <Badge variant="secondary" className="text-xs">restock</Badge>
                    )}
                    {item.type === "deep_clean" && (
                      <Badge variant="destructive" className="text-xs">deep clean</Badge>
                    )}
                    {item.type === "monthly" && (
                      <Badge variant="outline" className="text-xs">monthly</Badge>
                    )}
                  </label>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

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

      <Button onClick={handleComplete} disabled={saving}>
        {saving ? "Saving..." : "Mark Turnover Complete"}
      </Button>
    </div>
  );
}
