import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CleanerStatsProps {
  thisWeekCount: number;
  thisMonthCount: number;
  upcomingCount: number;
  completedCount: number;
}

export function CleanerStats({
  thisWeekCount,
  thisMonthCount,
  upcomingCount,
  completedCount,
}: CleanerStatsProps) {
  const stats = [
    { label: "This Week", value: thisWeekCount },
    { label: "This Month", value: thisMonthCount },
    { label: "Upcoming", value: upcomingCount },
    { label: "Completed", value: completedCount },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map(({ label, value }) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
