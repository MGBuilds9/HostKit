import * as LucideIcons from "lucide-react";
import { ShieldAlert } from "lucide-react";
import { toPascalCase } from "@/lib/utils";
import { SectionHeading } from "@/components/guest/section-heading";

interface Rule {
  rule: string;
  icon?: string;
}

export function HouseRulesSection({
  rules,
  securityNote,
}: {
  rules: Rule[];
  securityNote: string | null;
}) {
  if (rules.length === 0 && !securityNote?.trim()) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string; strokeWidth?: number }>
  >;

  return (
    <div>
      <SectionHeading title="House Rules" />

      {rules.length > 0 && (
        <ul
          className="divide-y overflow-hidden rounded-2xl border"
          style={{
            background: "var(--guest-card)",
            borderColor: "var(--guest-card-border)",
          }}
        >
          {rules.map((r, i) => {
            const Icon = r.icon
              ? icons[toPascalCase(r.icon)] ?? LucideIcons.CircleDot
              : LucideIcons.CircleDot;
            return (
              <li
                key={i}
                className="flex items-start gap-3 px-4 py-3 sm:px-5"
                style={{ borderColor: "var(--guest-card-border)" }}
              >
                <span
                  className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center"
                  style={{ color: "var(--guest-text-muted)" }}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 text-sm leading-relaxed">{r.rule}</span>
              </li>
            );
          })}
        </ul>
      )}

      {securityNote && (
        <div
          className={`${rules.length > 0 ? "mt-3 " : ""}flex items-start gap-3 rounded-2xl border px-4 py-3.5 sm:px-5`}
          style={{
            background: "var(--guest-warning-soft)",
            borderColor: "var(--guest-warning)",
            color: "var(--guest-warning-ink)",
          }}
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <p className="max-w-[58ch] text-sm leading-relaxed">{securityNote}</p>
        </div>
      )}
    </div>
  );
}
