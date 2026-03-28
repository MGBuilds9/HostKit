"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface TaskNotesEditableProps {
  notes: string;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}

interface TaskNotesReadonlyProps {
  notes: string;
}

export function TaskNotesEditable({ notes, saving, onChange, onSave }: TaskNotesEditableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Notes</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <Textarea
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Add notes about this cleaning task..."
          className="min-h-[80px] resize-none"
        />
        <Button variant="outline" size="sm" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save Notes"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function TaskNotesReadonly({ notes }: TaskNotesReadonlyProps) {
  if (!notes) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Notes</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
      </CardContent>
    </Card>
  );
}
