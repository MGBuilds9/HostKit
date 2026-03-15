import { requireAuth } from "@/lib/auth-guard";
import { MultiPropertyCalendar } from "@/components/admin/multi-property-calendar";

export default async function CalendarPage() {
  await requireAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Stays and cleaning tasks across all properties.
        </p>
      </div>
      <MultiPropertyCalendar />
    </div>
  );
}
