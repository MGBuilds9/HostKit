"use client";

import { useState, useEffect } from "react";
import { CalendarDays } from "lucide-react";
import { CalendarToolbar } from "./calendar/calendar-toolbar";
import { PropertyCalendarRow } from "./calendar/property-calendar-row";

interface CleaningTask {
  id: string;
  status: "pending" | "offered" | "accepted" | "in_progress" | "completed" | "cancelled";
  scheduledStart: string;
  scheduledEnd: string;
  assignedCleaner?: { fullName: string } | null;
}

interface Stay {
  id: string;
  guestName: string | null;
  status: "booked" | "blocked" | "cancelled";
  startDate: string;
  endDate: string;
  cleaningTasks: CleaningTask[];
}

interface PropertyGroup {
  propertyId: string;
  propertyName: string;
  stays: Stay[];
}

export function MultiPropertyCalendar() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [groups, setGroups] = useState<PropertyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propertyFilter, setPropertyFilter] = useState<string>("all");

  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + 6);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ from: fromDate.toISOString(), to: toDate.toISOString() });
    fetch(`/api/calendar?${params}`)
      .then((r) => { if (!r.ok) throw new Error(`Failed to load calendar: ${r.status}`); return r.json(); })
      .then(setGroups)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate.toISOString()]);

  function goToToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setFromDate(d);
  }

  function shiftWeek(delta: number) {
    setFromDate((prev) => { const d = new Date(prev); d.setDate(d.getDate() + delta * 7); return d; });
  }

  const filteredGroups = propertyFilter === "all" ? groups : groups.filter((g) => g.propertyId === propertyFilter);

  return (
    <div className="space-y-5">
      <CalendarToolbar
        fromDate={fromDate}
        toDate={toDate}
        groups={groups}
        propertyFilter={propertyFilter}
        onShiftWeek={shiftWeek}
        onGoToToday={goToToday}
        onFilterChange={setPropertyFilter}
      />

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-40 rounded bg-muted animate-pulse" />
              <div className="h-20 rounded-lg bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && filteredGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No stays in this period</p>
        </div>
      )}

      {!loading && !error && filteredGroups.length > 0 && (
        <div className="space-y-6 divide-y divide-border">
          {filteredGroups.map((group) => (
            <div key={group.propertyId} className="pt-4 first:pt-0">
              <PropertyCalendarRow group={group} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
