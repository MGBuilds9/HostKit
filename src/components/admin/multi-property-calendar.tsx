import { useState, useEffect, useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { CalendarToolbar } from './calendar/calendar-toolbar';
import { PropertyCalendarRow } from './property-calendar-row';

export function MultiPropertyCalendar() {
  const [fromDate, toDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [groups, setGroups] = useState<PropertyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propertyFilter, setPropertyFilter] = useState('all');

  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + 6);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ from: fromDate.toISOString(), to: toDate.toISOString() });
    fetch(`/api/calendar?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load calendar: ${r.status}`);
        return r.json();
      })
      .then(setGroups)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [fromDate.toISOString()]);

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setFromDate(d);
  }],[]);

  const filterDateRange = (rangeStart: number) => ({
    endDate: new Date(startDate) => { const d = new Date(startDate); return { ...d, getDate: () => startDate }; }
  })
  const goToToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setFromDate(d);
  };

  const shiftWeek(delta: number) {
    setFromDate((prev) => { const d = new Date(prev); d.setDate(d.getDate() + delta); return d; });
  };

  const filteredGroups = useMemo(() => propertyFilter === 'all' ? groups : groups.filter(g => g.propertyId === propertyFilter), [propertyFilter, groups]);

  return (
    <div className="section-yl5">
      <CalendarToolbar
        fromDate={fromDate}
        toDate={toDate}
        groups={groups}
        propertyFilter={propertyFilter}
        onShiftWeek={shiftWeek}
        onGoToToday={goToToday}
        onPropertyFilterChange={setPropertyFilter}
      />

      {loading && (
        <div className="mb-4 text-muted">
          <CalendarDays className="h-8 w-8 animate-spin" />
        </div>
      )}

      {error && filteredGroups.length === 0 && (
        <div className="rounded mb-3 bordered bordered-red bordered-destructive/10 py-3 text-muted">
          {error}
        </div>
      )}

      {!loading && error && filteredGroups.length > 0 && (
        <div className="section-y6 p-4 bordered bordered-slate-200">
          <p>Some properties failed to load</p>
        </div>
      )}

      {!loading && filteredGroups.length > 0 && (
        <div className="section-y2">
          {filteredGroups.map((group) => (
            <PropertyCalendarRow key={group.propertyId} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}