import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";

interface ChecklistSection {
  title: string;
  items: Array<{ label: string; type: string; completed: boolean }>;
}

interface Turnover {
  id: string;
  propertyId: string;
  completedAt: Date;
  completedBy?: string | null;
  nextGuestCheckin?: Date | null;
  notes?: string | null;
  checklistData: unknown;
  property?: { name: string } | null;
}

interface TurnoverFiltersProps {
  turnoverList: Turnover[];
}

function TurnoverCard({ t }: { t: Turnover }) {
  const completedAt = new Date(t.completedAt);
  const formattedDate = completedAt.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
  const formattedTime = completedAt.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" });
  const checklistData = t.checklistData as ChecklistSection[] | null;
  const totalItems = checklistData?.reduce((sum, s) => sum + s.items.length, 0) ?? 0;
  const completedItems = checklistData?.reduce((sum, s) => sum + s.items.filter((i) => i.completed).length, 0) ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-medium">{formattedDate} at {formattedTime}</CardTitle>
            <Link href={`/admin/properties/${t.propertyId}/turnovers`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {t.property?.name ?? "Unknown Property"}
            </Link>
          </div>
          {totalItems > 0 && (
            <Badge variant={completedItems === totalItems ? "default" : "secondary"} className="text-xs">
              {completedItems}/{totalItems} items
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {t.completedBy && <span><span className="font-medium text-foreground">By:</span> {t.completedBy}</span>}
          {t.nextGuestCheckin && (
            <span>
              <span className="font-medium text-foreground">Next check-in:</span>{" "}
              {new Date(t.nextGuestCheckin).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
            </span>
          )}
        </div>
        {t.notes && <p className="text-sm text-muted-foreground border-l-2 border-border pl-3">{t.notes}</p>}
        {checklistData && checklistData.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">View checklist details</summary>
            <div className="mt-2 space-y-2">
              {checklistData.map((section) => (
                <div key={section.title}>
                  <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">{section.title}</p>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => (
                      <li key={item.label} className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-sm border flex-shrink-0 ${item.completed ? "bg-primary border-primary" : "border-input"}`} />
                        <span className={item.completed ? "text-foreground" : "text-muted-foreground line-through"}>{item.label}</span>
                        {item.type === "restock" && <Badge variant="secondary" className="text-xs py-0">restock</Badge>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

export function TurnoverFilters({ turnoverList }: TurnoverFiltersProps) {
  if (turnoverList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <ClipboardCheck className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No turnovers recorded yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Start a turnover from any property&apos;s checklist page.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/admin/properties">View Properties</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {turnoverList.map((t) => <TurnoverCard key={t.id} t={t} />)}
    </div>
  );
}
