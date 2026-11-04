import { SectionHeading } from "@/components/guest/section-heading";
import { formatGuideTime } from "@/lib/guide-utils";

interface CheckoutStep {
  step: number;
  title: string;
  description: string;
}

export function CheckoutSection({
  steps,
  time,
}: {
  steps: CheckoutStep[];
  time?: string | null;
}) {
  const formatted = formatGuideTime(time);

  return (
    <div>
      <SectionHeading
        title="Check-Out Checklist"
        subtitle={
          formatted
            ? `Please complete before ${formatted} on departure morning.`
            : "Please complete these steps on departure morning."
        }
      />

      <ol
        className="divide-y overflow-hidden rounded-2xl border"
        style={{
          background: "var(--guest-card)",
          borderColor: "var(--guest-card-border)",
        }}
      >
        {steps.map((s) => (
          <li
            key={s.step}
            className="flex items-start gap-3 px-4 py-3 sm:px-5"
            style={{ borderColor: "var(--guest-card-border)" }}
          >
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold tabular-nums"
              style={{
                background: "var(--guest-section-bg)",
                borderColor: "var(--guest-card-border)",
                color: "var(--guest-text-muted)",
              }}
            >
              {String(s.step).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug">{s.title}</p>
              <p
                className="mt-0.5 text-xs leading-relaxed"
                style={{ color: "var(--guest-text-muted)" }}
              >
                {s.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
