"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

type TaskStatus = "pending" | "offered" | "accepted" | "in_progress" | "completed" | "cancelled";

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  offered: "Offered",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

interface Property {
  id: string;
  name: string;
}

interface TaskFiltersProps {
  fromDate: Date;
  toDate: Date;
  statusFilter: string;
  propertyFilter: string;
  properties: Property[];
  onShiftWeek: (delta: number) => void;
  onGoToToday: () => void;
  onStatusChange: (val: string) => void;
  onPropertyChange: (val: string) => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TaskFilters({
  fromDate,
  toDate,
  statusFilter,
  propertyFilter,
  properties,
  onShiftWeek,
  onGoToToday,
  onStatusChange,
  onPropertyChange,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-5">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onShiftWeek(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onGoToToday}>
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={() => onShiftWeek(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <span className="text-sm text-muted-foreground self-center">
        {formatDate(fromDate)} – {formatDate(toDate)}
      </span>

      <div className="flex gap-2 ml-auto flex-wrap">
        <div className="w-40">
          <Label className="sr-only">Filter by status</Label>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {properties.length > 1 && (
          <div className="w-48">
            <Label className="sr-only">Filter by property</Label>
            <Select value={propertyFilter} onValueChange={onPropertyChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All properties</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
