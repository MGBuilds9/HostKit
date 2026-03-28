"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type ItemType = "check" | "restock" | "deep_clean" | "monthly";

interface ChecklistItem {
  label: string;
  type: ItemType;
}

interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

interface TemplateSectionEditorProps {
  sections: ChecklistSection[];
  onUpdateTitle: (sIdx: number, title: string) => void;
  onRemoveSection: (sIdx: number) => void;
  onAddItem: (sIdx: number) => void;
  onRemoveItem: (sIdx: number, iIdx: number) => void;
  onUpdateItem: (sIdx: number, iIdx: number, field: keyof ChecklistItem, value: string) => void;
}

export function TemplateSectionEditor({
  sections,
  onUpdateTitle,
  onRemoveSection,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: TemplateSectionEditorProps) {
  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No sections yet. Click &quot;Add Section&quot; to get started.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section, sIdx) => (
        <Card key={sIdx}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Input
                value={section.title}
                onChange={(e) => onUpdateTitle(sIdx, e.target.value)}
                placeholder="Section title (e.g. Bedroom)"
                required
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveSection(sIdx)}
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
                  onChange={(e) => onUpdateItem(sIdx, iIdx, "label", e.target.value)}
                  placeholder="Item label"
                  required
                  className="flex-1"
                />
                <select
                  value={item.type}
                  onChange={(e) => onUpdateItem(sIdx, iIdx, "type", e.target.value)}
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
                  onClick={() => onRemoveItem(sIdx, iIdx)}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => onAddItem(sIdx)}>
              Add Item
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
