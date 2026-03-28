import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, ClipboardCheck, CalendarDays, SprayCan } from "lucide-react";
import Link from "next/link";

interface PrimaryStat {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
  bg: string;
}

interface SecondaryStat {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

interface StatsRowProps {
  propertyCount: number;
  upcomingStaysCount: number;
  pendingTaskCount: number;
  ownerCount: number;
  turnoverCount: number;
}

export function StatsRow({
  propertyCount,
  upcomingStaysCount,
  pendingTaskCount,
  ownerCount,
  turnoverCount,
}: StatsRowProps) {
  const primaryStats: PrimaryStat[] = [
    {
      label: "Properties",
      value: propertyCount,
      icon: Building2,
      href: "/admin/properties",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      label: "Upcoming Stays",
      value: upcomingStaysCount,
      icon: CalendarDays,
      href: "/admin/calendar",
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/50",
    },
    {
      label: "Pending Cleans",
      value: pendingTaskCount,
      icon: SprayCan,
      href: "/admin/cleaning-tasks",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/50",
    },
  ];

  const secondaryStats: SecondaryStat[] = [
    { label: "Owners", value: ownerCount, icon: Users, href: "/admin/owners" },
    { label: "Turnovers", value: turnoverCount, icon: ClipboardCheck, href: "/admin/turnovers" },
  ];

  return (
    <>
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {primaryStats.map(({ label, value, icon: Icon, href, color, bg }) => (
          <Link key={label} href={href} className="block">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className={`inline-flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-lg ${bg} mb-3`}>
                  <Icon className={`h-4 w-4 md:h-5 md:w-5 ${color}`} />
                </div>
                <div className="text-2xl md:text-3xl font-bold tracking-tight">{value}</div>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex gap-3 md:gap-4">
        {secondaryStats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="block flex-1">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-3 md:p-4 flex items-center gap-3">
                <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-lg md:text-xl font-bold">{value}</div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
