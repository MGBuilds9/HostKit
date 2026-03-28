"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  label: string;
  type: "check" | "restock" | "deep_clean" | "monthly";
}

interface ChecklistSectionProps {
  title: string;
  items: ChecklistItem[];
  checked: Record<string, boolean>;
  showDeepClean: boolean;
  onToggle: (sectionTitle: string, label: string) => void;
}

export function ChecklistSection({
  title,
  items,
  checked,
  showDeepClean,
  onToggle,
}: ChecklistSectionProps) {
  const visibleItems = items.filter(
    (item) => showDeepClean || item.type !== "deep_clean"
  );

  if (visibleItems.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2 sticky top-0 bg-card z-10 border-b">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {visibleItems.map((item) => {
          const key = `${title}:${item.label}`;
          const isChecked = !!checked[key];
          return (
            <label
              key={key}
              className="flex items-center gap-3 px-4 min-h-[48px] cursor-pointer border-b last:border-b-0 hover:bg-accent/50 transition-colors"
            >
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                  isChecked ? "bg-primary border-primary" : "border-input"
                )}
              >
                {isChecked && <Check className="h-4 w-4 text-primary-foreground" />}
              </div>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggle(title, item.label)}
                className="sr-only"
              />
              <span className={cn("text-base flex-1 transition-all", isChecked && "line-through opacity-60")}>
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
}
