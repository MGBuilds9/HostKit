"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, CalendarDays, ClipboardCheck, TrendingUp } from "lucide-react";

interface Turnover {
  id: string;
  propertyName: string;
  completedAt: string;
  completedBy: string | null;
}

interface Stay {
  id: string;
  propertyName: string;
  guestName: string | null;
  startDate: string;
  endDate: string;
}

interface OwnerDashboardProps {
  propertyCount: number;
  upcomingStaysCount: number;
  lastTurnoverDate: string | null;
  occupancyRate: number;
  recentTurnovers: Turnover[];
  upcomingStays: Stay[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function OwnerDashboard({
  propertyCount,
  upcomingStaysCount,
  lastTurnoverDate,
  occupancyRate,
  recentTurnovers,
  upcomingStays,
}: OwnerDashboardProps) {
  const stats = [
    {
      label: "Properties",
      value: propertyCount,
      icon: Building2,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      label: "Upcoming Stays",
      value: upcomingStaysCount,
      icon: CalendarDays,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/50",
    },
    {
      label: "Last Turnover",
      value: lastTurnoverDate ? formatDate(lastTurnoverDate) : "N/A",
      icon: ClipboardCheck,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/50",
    },
    {
      label: "Occupancy Rate",
      value: `${occupancyRate}%`,
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-4 md:p-6">
              <div
                className={`inline-flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-lg ${bg} mb-3`}
              >
                <Icon className={`h-4 w-4 md:h-5 md:w-5 ${color}`} />
              </div>
              <div className="text-xl md:text-2xl font-bold tracking-tight">
                {value}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                {label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity + Upcoming Stays */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Turnovers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Turnovers</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTurnovers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No recent turnovers
              </p>
            ) : (
              <div className="space-y-3">
                {recentTurnovers.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{t.propertyName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.completedAt)}
                        {t.completedBy && ` by ${t.completedBy}`}
                      </p>
                    </div>
                    <Badge variant="secondary">Completed</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Stays */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Stays</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingStays.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No upcoming stays
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingStays.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{s.propertyName}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.guestName ?? "Guest"} &middot;{" "}
                        {formatDate(s.startDate)} &ndash; {formatDate(s.endDate)}
                      </p>
                    </div>
                    <Badge>Booked</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
