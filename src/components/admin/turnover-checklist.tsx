"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
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

  const { totalItems, checkedCount } = useMemo(() => {
    if (!template) return { totalItems: 0, checkedCount: 0 };
    let total = 0;
    let done = 0;
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
      body: JSON.stringify({ checklistData, notes }),
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
      {/* Header with progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">{template.name}</h2>
          <span className="text-sm text-muted-foreground">
            {checkedCount} of {totalItems} done
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Deep clean toggle */}
        <div className="flex items-center gap-3">
          <Switch
            checked={showDeepClean}
            onCheckedChange={setShowDeepClean}
          />
          <Label className="text-sm cursor-pointer" onClick={() => setShowDeepClean(!showDeepClean)}>
            Include deep clean items
          </Label>
        </div>
      </div>

      {/* Sections */}
      {template.sections.map((section) => {
        const visibleItems = section.items.filter(
          (item) => showDeepClean || item.type !== "deep_clean"
        );
        if (visibleItems.length === 0) return null;

        return (
          <Card key={section.title}>
            <CardHeader className="pb-2 sticky top-0 bg-card z-10 border-b">
              <CardTitle className="text-sm">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {visibleItems.map((item) => {
                const key = `${section.title}:${item.label}`;
                const isChecked = !!checked[key];
                return (
                  <label
                    key={key}
                    className="flex items-center gap-3 px-4 min-h-[48px] cursor-pointer border-b last:border-b-0 hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                        isChecked
                          ? "bg-primary border-primary"
                          : "border-input"
                      )}
                    >
                      {isChecked && <Check className="h-4 w-4 text-primary-foreground" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(section.title, item.label)}
                      className="sr-only"
                    />
                    <span className={cn(
                      "text-base flex-1 transition-all",
                      isChecked && "line-through opacity-60"
                    )}>
                      {item.label}
                    </span>
                    {item.type === "restock" && (
                      <Badge variant="secondary" className="text-xs shrink-0">restock</Badge>
                    )}
                    {item.type === "deep_clean" && (
                      <Badge variant="destructive" className="text-xs shrink-0">deep clean</Badge>
                    )}
                    {item.type === "monthly" && (
                      <Badge variant="outline" className="text-xs shrink-0">monthly</Badge>
                    )}
                  </label>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Notes */}
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

      {/* Fixed bottom button on mobile */}
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
