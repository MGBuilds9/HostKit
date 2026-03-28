import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            Upcoming Stays
          </CardTitle>
          <Link
            href="/admin/calendar"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {upcomingStays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No upcoming stays</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stays will appear once calendars are synced
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingStays.map((stay) => (
              <div
                key={stay.id}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
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
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 whitespace-nowrap ml-2">
                  {stay.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
