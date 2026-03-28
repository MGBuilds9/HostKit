"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateSectionEditor } from "./_components/template-section-editor";

type ItemType = "check" | "restock" | "deep_clean" | "monthly";

interface ChecklistItem {
  label: string;
  type: ItemType;
}

interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

export function ChecklistTemplateForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<ChecklistSection[]>([]);

  function addSection() {
    setSections((prev) => [...prev, { title: "", items: [] }]);
  }

  function removeSection(sIdx: number) {
    setSections((prev) => prev.filter((_, i) => i !== sIdx));
  }

  function updateSectionTitle(sIdx: number, title: string) {
    setSections((prev) => prev.map((s, i) => (i === sIdx ? { ...s, title } : s)));
  }

  function addItem(sIdx: number) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sIdx ? { ...s, items: [...s.items, { label: "", type: "check" }] } : s
      )
    );
  }

  function removeItem(sIdx: number, iIdx: number) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sIdx ? { ...s, items: s.items.filter((_, j) => j !== iIdx) } : s
      )
    );
  }

  function updateItem(sIdx: number, iIdx: number, field: keyof ChecklistItem, value: string) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sIdx
          ? { ...s, items: s.items.map((item, j) => j === iIdx ? { ...item, [field]: value } : item) }
          : s
      )
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const body = { name: formData.get("name") as string, isGlobal: formData.get("isGlobal") === "on", sections };
    const res = await fetch("/api/templates/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      router.push("/admin/templates/checklist");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data?.error?.formErrors?.[0] ?? "Failed to create checklist template. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">New Checklist Template</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required placeholder="Standard Turnover Checklist" />
            </div>
            <div className="flex items-center gap-2">
              <input id="isGlobal" name="isGlobal" type="checkbox" defaultChecked className="h-4 w-4 rounded border-input accent-primary" />
              <Label htmlFor="isGlobal">Global template (available to all properties)</Label>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Sections</h2>
            <Button type="button" variant="outline" size="sm" onClick={addSection}>
              Add Section
            </Button>
          </div>
          <TemplateSectionEditor
            sections={sections}
            onUpdateTitle={updateSectionTitle}
            onRemoveSection={removeSection}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onUpdateItem={updateItem}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Create Checklist Template"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
