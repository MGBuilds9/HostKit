import React, { memo, useMemo } from "react"
import NextLink from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/badge"

export interface ChecklistSection {
  title: string;
  items: Array<{ label: string; type: string; completed: boolean }[]>;
}

export interface Turnover {
  id: string;
  propertyId: string;
  completedAt: Date;
  completedBy?: string;
  nextChecklist?: Date;
  notes?: string;
  checklistData?: Record<string, ChecklistSection>;
  property?: { name: string };
}

export interface TurnoverFiltersProps {
  turnoverList: Turnover[];
}

export const TurnoverChart = memo(function TurnoverChart({ d }: { d: Turnover }) {
  const formattedDate = useMemo(() => new Date(d.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), [d.completedAt]);
  const formattedTime = useMemo(() => new Date(d.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), [d.completedAt]);
  const checklistDataAsSection = d.checklistData as ChecklistSection[] | undefined | null;
  const totalItems = useMemo(() => checklistDataAsSection?.reduce((total, section) => total + section.items.length, 0) ?? 0, [checklistDataAsSection]);
  const completedItems = useMemo(() => checklistDataAsSection?.reduce((total, section) => total + section.items.filter((item) => item.completed).length, 0) ?? 0, [checklistDataAsSection]);

  return (
    <Card>
      <CardHeader className="py-2">
        <div className="flex items-start flex-wrap justify-between">
          <div>
            <CardTitle className="text-sm font-medium">{formattedDate} at {formattedTime}</CardTitle>
            <Link href={d.propertyId ? `/admin/properties/${d.propertyId}/turnovers`} className="text-xs text-gray-500 hover:no-underline">Property</Link>
            {d.property?.name && <span className="text-sm">{d.property.name}</span>}
          </div>
          <div className="text-right">
            {d.completedBy && (
              <span className="text-xs">Completed by {d.completedBy}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex items-start flex-wrap gap-4">
          {totalItems > 0 && (
            <div className="text-sm">
              {totalItems} item{totalItems !== 1 && "s"}
              {" – "}
              {completedItems}/{totalItems} completed
              <span> ({Math.round((completedItems / totalItems) * 100)}%)</span>
            </div>
          )}
          {totalItems === 0 ? (
            <Progress className="h-3" value={0} />
          ) : (
            <Progress
              value={
                completedItems === totalItems
                  ? 100
                  : (completedItems / totalItems) * 100
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => prevProps.d.id === nextProps.d.id && prevProps.d.completedAt === nextProps.d.completedAt && prevProps.d.checklistData === nextProps.d.checklistData);

export const TurnoverFilters({ turnoverList }: TurnoverFiltersProps) {
  if (turnoverList.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-gray-500">No turnovers recorded yet.</p>
        <p className="text-xs text-gray-400">Start a turnover from any property's checklist page.</p>
        <Button asChild className="mt-4">
          <Link href="/admin/properties">View Properties</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {turnoverList.map((t) => <TurnoverChart key={t.id} d={t} />)}
    </div>
  );
}