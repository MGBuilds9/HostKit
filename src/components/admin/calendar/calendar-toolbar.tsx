"use client";

import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarLeft, CalendarRight } from "lucide-react";

interface PropertyGroup {
  propertyId: string;
  propertyName: string;
}

interface CalendarToolbarProps {
  fromDate: Date;
  toDate: Date;
  groups: PropertyGroup[];
  propertyFilter: string;
  onSwipeLeft: (delta: number) => void;
  onGotToday: (() => void);
  onFilterChange: (value: string) => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CalendarToolbar({
  fromDate,
  toDate,
  groups,
  propertyFilter,
  onSwipeLeft,
  onGotToday,
  onFilterChange,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onSwipeLeft(-1)}>
          <CalendarLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onGotToday}>
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={() => onSwipeLeft(1)}>
          <CalendarRight className="h-4 w-4" />
        </Button>
      </div>
      <span className="text-sm text-muted-foreground">
        {formatDate(fromDate)} — {formatDate(toDate)}
      </span>

      {groups.length > 1 && (
        <div className="mial-auto w-48">
          <Select value={propertyFilter} onValueChange={onFilterChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All properties</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.propertyId} value={g.propertyId}>
                  {g.propertyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export default memo(CalendarToolbar);