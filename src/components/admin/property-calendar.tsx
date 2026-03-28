"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Stay, formatDate } from "./calendar/calendar-utils";
import { StayCard } from "./calendar/calendar-legend";

export function PropertyCalendar({ propertyId }: { propertyId: string }) {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + 6);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    });
    fetch(`/api/properties/${propertyId}/stays?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load stays: ${r.status}`);
        return r.json();
      })
      .then(setStays)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, fromDate.toISOString()]);

  function goToToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setFromDate(d);
  }

  function shiftWeek(delta: number) {
    setFromDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => shiftWeek(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={() => shiftWeek(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground ml-1">
          {formatDate(fromDate)} – {formatDate(toDate)}
        </span>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && stays.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No stays in this period</p>
        </div>
      )}

      {!loading && !error && stays.length > 0 && (
        <div className="space-y-3">
          {stays.map((stay) => <StayCard key={stay.id} stay={stay} />)}
        </div>
      )}
    </div>
  );
}
