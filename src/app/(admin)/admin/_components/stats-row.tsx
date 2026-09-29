import { Building2, Users, ClipboardCheck, CalendarDays, SprayCan } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsRowProps {
  propertyCount: number;
  upcomingStaysCount: number;
  pendingTaskCount: number;
  ownerCount: number;
  turnoverCount: number;
}

/**
 * Admin dashboard stats — adopts the Open Design `.stat` card pattern
 * (real elevation, hover lift, large value, comfortable touch target).
 */
export function StatsRow({
  propertyCount,
  upcomingStaysCount,
  pendingTaskCount,
  ownerCount,
  turnoverCount,
}: StatsRowProps) {
  const primaryStats = [
    {
      label: "Properties",
      value: propertyCount,
      icon: Building2,
      href: "/admin/properties",
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      label: "Upcoming Stays",
      value: upcomingStaysCount,
      icon: CalendarDays,
      href: "/admin/calendar",
      iconColor: "text-violet-600 dark:text-violet-400",
      iconBg: "bg-violet-50 dark:bg-violet-950/50",
    },
    {
      label: "Pending Cleans",
      value: pendingTaskCount,
      icon: SprayCan,
      href: "/admin/cleaning-tasks",
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-50 dark:bg-amber-950/50",
    },
  ];

  const secondaryStats = [
    { label: "Owners", value: ownerCount, icon: Users, href: "/admin/owners" },
    { label: "Turnovers", value: turnoverCount, icon: ClipboardCheck, href: "/admin/turnovers" },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
        {primaryStats.map(({ label, value, icon, href, iconColor, iconBg }) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            icon={icon}
            href={href}
            iconColor={iconColor}
            iconBg={iconBg}
          />
        ))}
      </div>

      <div className="flex gap-3 md:gap-4">
        {secondaryStats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="group block flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="h-full rounded-lg border bg-card shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex min-h-[64px] items-center gap-3 p-4 md:p-5">
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-bold leading-tight md:text-xl">{value}</div>
                  <p className="truncate text-xs text-muted-foreground md:text-sm">{label}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-muted-foreground/50 transition-colors",
                    "group-hover:text-foreground"
                  )}
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                  >
                    <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
