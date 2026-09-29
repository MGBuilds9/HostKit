import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * RowItem — elevated list row (open-design `.list-row` / upcoming pattern).
 * A bordered, hoverable row used inside cards and timelines. Keeps content
 * left-aligned with an optional trailing badge/icon. At least 44px tall.
 */
interface RowItemProps extends React.HTMLAttributes<HTMLDivElement> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  interactive?: boolean;
}

export function RowItem({
  leading,
  trailing,
  interactive = false,
  className,
  children,
  ...props
}: RowItemProps) {
  return (
    <div
      className={cn(
        "flex min-h-[44px] items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors",
        interactive && "hover:border-border hover:bg-accent/40",
        className
      )}
      {...props}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">{children}</div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
