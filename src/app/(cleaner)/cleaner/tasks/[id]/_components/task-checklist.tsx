"use client";

import { cn } from "@/lib/utils";
import { CheckSquare, Square } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChecklistSection } from "./task-types";

interface TaskChecklistProps {
  checklist: ChecklistSection[];
  saveStatus: "idle" | "saving" | "saved";
  onToggleItem: (sectionIdx: number, itemIdx: number) => void;
}

export function TaskChecklist({ checklist, saveStatus, onToggleItem }: TaskChecklistProps) {
  if (checklist.length === 0) return null;

  const totalItems = checklist.reduce((sum, s) => sum + s.items.length, 0);
  const checkedItems = checklist.reduce(
    (sum, s) => sum + s.items.filter((i) => i.checked).length,
    0
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Checklist</CardTitle>
            {saveStatus === "saving" && (
              <span className="text-xs text-muted-foreground">Saving...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-green-600">Saved</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {checkedItems} / {totalItems}
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{
              width: totalItems > 0 ? `${(checkedItems / totalItems) * 100}%` : "0%",
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        {checklist.map((section, si) => (
          <div key={si}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {section.title}
            </p>
            <div className="space-y-2">
              {section.items.map((item, ii) => (
                <button
                  key={ii}
                  onClick={() => onToggleItem(si, ii)}
                  className={cn(
                    "flex items-start gap-2.5 w-full text-left text-sm rounded-md p-2 transition-colors",
                    item.checked
                      ? "text-muted-foreground line-through"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  {item.checked ? (
                    <CheckSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
