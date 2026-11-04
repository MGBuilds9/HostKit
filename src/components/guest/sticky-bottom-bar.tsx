import type { CSSProperties } from "react";
import { Phone, AlertTriangle } from "lucide-react";
import { normalizeDialablePhone } from "@/lib/guide-utils";

type SurfaceVars = CSSProperties & {
  "--guest-ctl-bg"?: string;
  "--guest-ctl-bg-hover"?: string;
  "--guest-ctl-fg"?: string;
};

export function StickyBottomBar({
  hostPhone,
  emergency,
}: {
  hostPhone: string | null;
  emergency: string | null;
}) {
  const dialableHost = normalizeDialablePhone(hostPhone);
  const dialableEmergency = normalizeDialablePhone(emergency);

  if (!dialableHost && !dialableEmergency) return null;

  return (
    <div
      role="region"
      aria-label="Quick contact actions"
      className="fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md md:hidden"
      style={{
        background: "color-mix(in oklch, var(--guest-card) 94%, transparent)",
        borderColor: "var(--guest-card-border)",
        boxShadow: "var(--shadow-3)",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-2.5 px-4 pt-3 sm:max-w-2xl sm:px-8 md:max-w-4xl lg:max-w-6xl">
        {dialableHost && (
          <a
            href={dialableHost.href}
            className="guest-control-surface flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold leading-none transition-[background-color,color,transform] duration-150 active:scale-[0.99]"
            style={
              {
                "--guest-ctl-bg": "var(--guest-cta-bg)",
                "--guest-ctl-bg-hover": "var(--guest-cta-hover)",
                "--guest-ctl-fg": "var(--guest-cta-ink)",
              } as SurfaceVars
            }
          >
            <Phone className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span>Call Host</span>
          </a>
        )}
        {dialableEmergency && (
          <a
            href={dialableEmergency.href}
            aria-label={`SOS — call emergency services (${dialableEmergency.display})`}
            className="guest-control-surface flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-sm font-semibold leading-none transition-[background-color,color,transform] duration-150 active:scale-[0.99]"
            style={
              {
                "--guest-ctl-bg": "var(--guest-danger-fill)",
                "--guest-ctl-bg-hover":
                  "color-mix(in oklch, var(--guest-on-danger) 12%, var(--guest-danger-fill))",
                "--guest-ctl-fg": "var(--guest-on-danger)",
              } as SurfaceVars
            }
          >
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span>SOS</span>
          </a>
        )}
      </div>
    </div>
  );
}
