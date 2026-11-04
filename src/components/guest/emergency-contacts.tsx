import type { CSSProperties } from "react";
import { Phone, Siren } from "lucide-react";
import { SectionHeading } from "@/components/guest/section-heading";
import { normalizeDialablePhone } from "@/lib/guide-utils";

interface Props {
  emergency: string | null;
  hostPhone: string | null;
  ownerPhone: string | null;
}

type SurfaceVars = CSSProperties & {
  "--guest-ctl-bg"?: string;
  "--guest-ctl-border"?: string;
  "--guest-ctl-fg"?: string;
};

export function EmergencyContacts({ emergency, hostPhone, ownerPhone }: Props) {
  const dialableHost = normalizeDialablePhone(hostPhone);
  const dialableOwner = normalizeDialablePhone(ownerPhone);
  const dialableEmergency = normalizeDialablePhone(emergency);

  const contacts = [
    dialableHost && {
      label: "Your Host",
      ariaName: "Your Host",
      phone: dialableHost,
      urgent: false,
    },
    dialableOwner && {
      label: "Owner",
      ariaName: "Owner — Property Owner",
      phone: dialableOwner,
      urgent: false,
    },
    dialableEmergency && {
      label: "Emergency",
      ariaName: "Emergency Services",
      phone: dialableEmergency,
      urgent: true,
    },
  ].filter(Boolean) as {
    label: string;
    ariaName: string;
    phone: { display: string; href: string };
    urgent: boolean;
  }[];

  if (contacts.length === 0) return null;

  return (
    <div>
      <SectionHeading title="Direct & Emergency Contacts" />
      <div className="space-y-2">
        {contacts.map((c) => {
          const surfaceStyle: SurfaceVars = c.urgent
            ? {
                "--guest-ctl-bg": "var(--guest-danger-soft)",
                "--guest-ctl-border": "var(--guest-danger)",
                "--guest-ctl-fg": "var(--guest-danger-ink)",
              }
            : {
                "--guest-ctl-bg": "var(--guest-card)",
                "--guest-ctl-border": "var(--guest-control-border)",
                "--guest-ctl-fg": "var(--guest-text)",
              };

          return (
            <a
              key={c.ariaName}
              href={c.phone.href}
              aria-label={`${c.ariaName}: ${c.phone.display}`}
              className="guest-control-surface flex min-h-[54px] flex-wrap items-center justify-between gap-x-2.5 gap-y-1 rounded-2xl border px-3.5 py-2.5 transition-[background-color,border-color,transform] duration-150 active:scale-[0.99] sm:px-5 sm:py-3"
              style={surfaceStyle}
            >
              <span className="inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap">
                {c.urgent ? (
                  <Siren
                    className="h-4 w-4 shrink-0"
                    strokeWidth={1.75}
                    style={{ color: "var(--guest-danger)" }}
                  />
                ) : (
                  <Phone
                    className="h-4 w-4 shrink-0"
                    strokeWidth={1.75}
                    style={{ color: "var(--guest-text-muted)" }}
                  />
                )}
                <span className="text-sm font-semibold">{c.label}</span>
              </span>
              <span
                className="shrink-0 whitespace-nowrap font-mono text-[13px] font-semibold tabular-nums sm:text-sm"
                style={{
                  color: c.urgent ? "var(--guest-danger-ink)" : "var(--guest-text-muted)",
                }}
              >
                {c.phone.display}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
