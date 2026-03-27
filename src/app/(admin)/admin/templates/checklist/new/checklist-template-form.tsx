"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    setSections((prev) =>
      prev.map((s, i) => (i === sIdx ? { ...s, title } : s))
    );
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
          ? {
              ...s,
              items: s.items.map((item, j) =>
                j === iIdx ? { ...item, [field]: value } : item
              ),
            }
          : s
      )
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      isGlobal: formData.get("isGlobal") === "on",
      sections,
    };

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
              <input
                id="isGlobal"
                name="isGlobal"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-input accent-primary"
              />
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

          {sections.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No sections yet. Click &quot;Add Section&quot; to get started.
            </p>
          )}

          {sections.map((section, sIdx) => (
            <Card key={sIdx}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Input
                    value={section.title}
                    onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                    placeholder="Section title (e.g. Bedroom)"
                    required
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSection(sIdx)}
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    Remove
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.items.map((item, iIdx) => (
                  <div key={iIdx} className="flex items-center gap-2">
                    <Input
                      value={item.label}
                      onChange={(e) => updateItem(sIdx, iIdx, "label", e.target.value)}
                      placeholder="Item label"
                      required
                      className="flex-1"
                    />
                    <select
                      value={item.type}
                      onChange={(e) => updateItem(sIdx, iIdx, "type", e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="check">Check</option>
                      <option value="restock">Restock</option>
                      <option value="deep_clean">Deep Clean</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(sIdx, iIdx)}
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      Remove
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addItem(sIdx)}
                >
                  Add Item
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Create Checklist Template"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
