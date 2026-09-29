"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
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
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      label: "Upcoming Stays",
      value: upcomingStaysCount,
      icon: CalendarDays,
      iconColor: "text-violet-600 dark:text-violet-400",
      iconBg: "bg-violet-50 dark:bg-violet-950/50",
    },
    {
      label: "Last Turnover",
      value: lastTurnoverDate ? formatDate(lastTurnoverDate) : "N/A",
      icon: ClipboardCheck,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-50 dark:bg-amber-950/50",
    },
    {
      label: "Occupancy Rate",
      value: `${occupancyRate}%`,
      icon: TrendingUp,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards — Open Design `.stat` pattern via shared StatCard */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {stats.map(({ label, value, icon, iconColor, iconBg }) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            icon={icon}
            iconColor={iconColor}
            iconBg={iconBg}
          />
        ))}
      </div>

      {/* Recent Activity + Upcoming Stays */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Turnovers */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Turnovers</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentTurnovers.length === 0 ? (
              <EmptyState
                dashed
                icon={ClipboardCheck}
                title="No recent turnovers"
                description="Completed cleanings will show up here."
              />
            ) : (
              <ul className="space-y-2">
                {recentTurnovers.map((t) => (
                  <li
                    key={t.id}
                    className="flex min-h-[52px] items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.propertyName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.completedAt)}
                        {t.completedBy && ` by ${t.completedBy}`}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">Completed</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Stays */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Upcoming Stays</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingStays.length === 0 ? (
              <EmptyState
                dashed
                icon={CalendarDays}
                title="No upcoming stays"
                description="New bookings will appear here once scheduled."
              />
            ) : (
              <ul className="space-y-2">
                {upcomingStays.map((s) => (
                  <li
                    key={s.id}
                    className="flex min-h-[52px] items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.propertyName}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.guestName ?? "Guest"} &middot;{" "}
                        {formatDate(s.startDate)} &ndash; {formatDate(s.endDate)}
                      </p>
                    </div>
                    <Badge className="shrink-0">Booked</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
