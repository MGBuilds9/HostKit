import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/**
 * StatCard — Open Design "stat" pattern.
 * Icon chip + value + label with real elevation and a comfortable
 * touch target. Renders as a link (when `href` is set) or a plain card.
 *
 * Visual system maps to hostkit-ui.css `.stat`:
 *   padding s-5/s-6, gap s-3, value 2.25rem/700 display, muted small label.
 */
interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  /** Tailwind text colour for the icon (e.g. "text-blue-600"). */
  iconColor?: string;
  /** Tailwind chip background (e.g. "bg-blue-50"). */
  iconBg?: string;
  href?: string;
  /** Show a subtle arrow affordance when the card is a link. */
  hint?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = "text-muted-foreground",
  iconBg = "bg-muted",
  href,
  hint,
  className,
}: StatCardProps) {
  const body = (
    <Card
      className={cn(
        "h-full rounded-lg border bg-card shadow-sm transition-all duration-200 ease-out",
        href && "hover:-translate-y-0.5 hover:border-border hover:shadow-md",
        className
      )}
    >
      <CardContent className="flex h-full min-h-[76px] flex-col justify-start gap-3 p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              iconBg
            )}
          >
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
          {href && (
            <span className="text-muted-foreground/60 transition-colors group-hover:text-foreground">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </div>
        <div className="mt-auto">
          <div className="text-2xl font-bold leading-none tracking-tight md:text-3xl">
            {value}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground md:text-sm">{label}</p>
          {href && hint && (
            <p className="mt-0.5 text-[11px] font-medium text-muted-foreground/70">{hint}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {body}
      </Link>
    );
  }
  return body;
}
