import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Soft dashed container — Open Design `.kb-empty` pattern. */
  dashed?: boolean;
  className?: string;
}

/**
 * EmptyState — Open Design `.kb-empty` pattern.
 * Renders inside cards / list panels where a section has no content.
 * Uses existing semantic tokens so it re-tints with the theme.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  dashed = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        dashed && "rounded-lg border border-dashed border-border bg-muted/20 px-6",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground/70">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
