import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string | null;
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("mb-4", className)}>
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "hsl(var(--guest-text-muted))" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
