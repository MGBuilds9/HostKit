import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Home, CalendarDays, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Stay {
  id: string;
  status: string | null;
  guestName: string | null;
  startDate: Date;
  endDate: Date;
  property: { name: string };
}

interface UpcomingSectionProps {
  upcomingStays: Stay[];
}

export function UpcomingSection({ upcomingStays }: UpcomingSectionProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Home className="h-4 w-4 text-muted-foreground" />
            Upcoming Stays
          </CardTitle>
          <Link
            href="/admin/calendar"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {upcomingStays.length === 0 ? (
          <EmptyState
            dashed
            icon={CalendarDays}
            title="No upcoming stays"
            description="Stays will appear once calendars are synced"
            className="py-10"
          />
        ) : (
          <ul className="space-y-2">
            {upcomingStays.map((stay) => (
              <li
                key={stay.id}
                className="flex min-h-[52px] items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-border hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {stay.guestName || "Guest"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stay.property.name} &middot;{" "}
                    {new Date(stay.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    {" - "}
                    {new Date(stay.endDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <span className="ml-2 whitespace-nowrap rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  {stay.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
