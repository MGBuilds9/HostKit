import type { CSSProperties } from "react";
import Image from "next/image";
import {
  MapPin,
  ArrowDown,
  ExternalLink,
  Phone,
  AlertTriangle,
} from "lucide-react";
import { CopyButton } from "@/components/guest/copy-button";
import {
  formatGuideTime,
  normalizeDialablePhone,
} from "@/lib/guide-utils";

interface HeroProps {
  name: string;
  description: string | null;
  city: string;
  province?: string | null;
  postalCode?: string | null;
  unit?: string | null;
  floor?: string | null;
  layout?: string | null;
  checkinTime?: string | null;
  checkoutTime?: string | null;
  wifiName?: string | null;
  wifiPassword?: string | null;
  buzzerName?: string | null;
  parkingSpot?: string | null;
  addressLine?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  imageUrl?: string | null;
  hasArrival?: boolean;
  hasWifi?: boolean;
  hasParking?: boolean;
  hostPhone?: string | null;
  emergencyContact?: string | null;
}

type SurfaceVars = CSSProperties & {
  "--guest-ctl-bg"?: string;
  "--guest-ctl-bg-hover"?: string;
  "--guest-ctl-border"?: string;
  "--guest-ctl-fg"?: string;
};

export function HeroSection({
  name,
  description,
  city,
  province,
  postalCode,
  unit,
  floor,
  layout,
  checkinTime,
  checkoutTime,
  wifiName,
  wifiPassword,
  buzzerName,
  parkingSpot,
  addressLine,
  latitude,
  longitude,
  imageUrl,
  hasArrival = false,
  hasWifi = false,
  hasParking = false,
  hostPhone,
  emergencyContact,
}: HeroProps) {
  const fullAddress = [
    addressLine ? (unit ? `${addressLine}, Unit ${unit}` : addressLine) : null,
    city,
    [province, postalCode].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  const mapsQuery =
    latitude && longitude
      ? `${latitude},${longitude}`
      : encodeURIComponent(fullAddress || `${name} ${city}`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  const metaParts = [
    city,
    floor ? `${floor} floor` : null,
    layout ?? null,
  ].filter(Boolean);

  const formattedCheckin = formatGuideTime(checkinTime);
  const formattedCheckout = formatGuideTime(checkoutTime);
  const dialableHost = normalizeDialablePhone(hostPhone);
  const dialableEmergency = normalizeDialablePhone(emergencyContact);
  const hasAnyEssentials = Boolean(
    buzzerName ||
      parkingSpot ||
      wifiName ||
      formattedCheckin ||
      formattedCheckout,
  );

  return (
    <header className="px-4 pt-3 pb-5 sm:px-8 sm:pt-8 sm:pb-11 lg:pt-9 lg:pb-12">
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* Left column: Property identity, address, & immediate actions */}
        <div className="min-w-0 lg:col-span-7">
          {metaParts.length > 0 && (
            <p
              className="flex flex-wrap items-center gap-2 text-xs font-medium"
              style={{ color: "var(--guest-text-muted)" }}
            >
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--guest-accent)" }}
              />
              <span>{metaParts.join(" · ")}</span>
            </p>
          )}

          <h1
            className="mt-1 sm:mt-2 font-[family-name:var(--font-dm-sans)] text-2xl sm:text-4xl lg:text-[2.625rem] font-bold tracking-tight not-italic leading-[1.08]"
            style={{ overflowWrap: "anywhere", minWidth: 0 }}
          >
            {name}
          </h1>

          {addressLine && (
            <div className="mt-1.5 sm:mt-3">
              <p
                className="flex items-start gap-1.5 text-xs sm:text-sm font-medium leading-snug"
                style={{ color: "var(--guest-text)" }}
              >
                <MapPin
                  className="mt-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0"
                  strokeWidth={1.75}
                  style={{ color: "var(--guest-accent)" }}
                />
                <span className="min-w-0 break-words">{fullAddress}</span>
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="guest-control-surface inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-medium leading-none transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.985]"
                  style={
                    {
                      "--guest-ctl-bg": "var(--guest-section-bg)",
                      "--guest-ctl-border": "var(--guest-control-border)",
                      "--guest-ctl-fg": "var(--guest-text)",
                    } as SurfaceVars
                  }
                >
                  <span>Open Maps</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                </a>
                <CopyButton
                  value={fullAddress}
                  label="Copy address"
                  copiedLabel="Address copied"
                />
              </div>
            </div>
          )}

          <p
            className="mt-2.5 sm:mt-3 max-w-[56ch] text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: "var(--guest-text-muted)" }}
          >
            {description ?? `Everything you need for a smooth arrival and stay in ${city}.`}
          </p>

          {(hasArrival || wifiPassword || dialableHost || dialableEmergency) && (
            <div className="mt-3 sm:mt-6 flex flex-wrap items-center gap-2 sm:gap-2.5">
              {hasArrival && (
                <a
                  href="#arrival"
                  className="guest-control-surface inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold leading-none transition-[background-color,color,transform] duration-150 active:scale-[0.99]"
                  style={
                    {
                      "--guest-ctl-bg": "var(--guest-cta-bg)",
                      "--guest-ctl-bg-hover": "var(--guest-cta-hover)",
                      "--guest-ctl-fg": "var(--guest-cta-ink)",
                    } as SurfaceVars
                  }
                >
                  <span>Start check-in</span>
                  <ArrowDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" strokeWidth={1.75} />
                </a>
              )}

              {wifiPassword && (
                <CopyButton
                  value={wifiPassword}
                  label="Copy Wi-Fi"
                  copiedLabel="Wi-Fi copied"
                  ariaLabel="Copy Wi-Fi password"
                  variant="secondary"
                />
              )}

              {/* Desktop quick-contact actions (replaces mobile StickyBottomBar on md+) */}
              {dialableHost && (
                <a
                  href={dialableHost.href}
                  className="guest-control-surface hidden md:inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 py-2.5 text-sm font-semibold leading-none transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.985]"
                  style={
                    {
                      "--guest-ctl-bg": "var(--guest-card)",
                      "--guest-ctl-border": "var(--guest-control-border)",
                      "--guest-ctl-fg": "var(--guest-text)",
                    } as SurfaceVars
                  }
                >
                  <Phone
                    className="h-4 w-4 shrink-0"
                    strokeWidth={1.75}
                    style={{ color: "var(--guest-accent)" }}
                  />
                  <span>Call Host</span>
                </a>
              )}

              {dialableEmergency && (
                <a
                  href={dialableEmergency.href}
                  aria-label={`SOS — call emergency services (${dialableEmergency.display})`}
                  className="guest-control-surface hidden md:inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 py-2.5 text-sm font-semibold leading-none transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.985]"
                  style={
                    {
                      "--guest-ctl-bg": "var(--guest-danger-soft)",
                      "--guest-ctl-border": "var(--guest-danger)",
                      "--guest-ctl-fg": "var(--guest-danger-ink)",
                    } as SurfaceVars
                  }
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span>SOS</span>
                </a>
              )}
            </div>
          )}

          {imageUrl && (
            <div
              className="relative mt-5 sm:mt-6 aspect-[16/10] w-full overflow-hidden rounded-2xl border"
              style={{ borderColor: "var(--guest-card-border)" }}
            >
              <Image
                src={imageUrl}
                alt={`Arrival at ${name}`}
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover"
                priority
              />
            </div>
          )}
        </div>

        {/* Right column: Hallmark F3 Tabular Spec Sheet — Stay Essentials at a glance */}
        {hasAnyEssentials && (
          <aside
            aria-label="Stay essentials"
            className="min-w-0 rounded-2xl border lg:col-span-5"
            style={{
              background: "var(--guest-card)",
              borderColor: "var(--guest-card-border)",
            }}
          >
            <div
              className="flex flex-col border-b px-3.5 py-2.5 sm:px-5 sm:py-3"
              style={{ borderColor: "var(--guest-card-border)" }}
            >
              <h2
                className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold tracking-tight not-italic"
                style={{ overflowWrap: "anywhere", minWidth: 0 }}
              >
                Stay Essentials
              </h2>
              {unit && (
                <p
                  className="mt-0.5 text-xs tabular-nums"
                  style={{ color: "var(--guest-text-muted)" }}
                >
                  Unit {unit} · Quick arrival reference
                </p>
              )}
            </div>

            <dl
              className="divide-y text-sm"
              style={{ borderColor: "var(--guest-card-border)" }}
            >
              {buzzerName && (
                <div
                  className="flex items-center justify-between gap-3 px-3.5 py-2 sm:px-5 sm:py-2.5"
                  style={{ borderColor: "var(--guest-card-border)" }}
                >
                  <div className="min-w-0">
                    <dt
                      className="text-xs font-medium"
                      style={{ color: "var(--guest-text-muted)" }}
                    >
                      Intercom directory
                    </dt>
                    <dd className="mt-0.5 break-words font-mono text-sm font-semibold tabular-nums">
                      {buzzerName}
                    </dd>
                  </div>
                  <CopyButton
                    value={buzzerName}
                    label="Copy"
                    copiedLabel="Copied"
                    ariaLabel={`Copy intercom name ${buzzerName}`}
                  />
                </div>
              )}

              {parkingSpot && (
                <div
                  className="flex items-center justify-between gap-3 px-3.5 py-2 sm:px-5 sm:py-2.5"
                  style={{ borderColor: "var(--guest-card-border)" }}
                >
                  <div className="min-w-0">
                    <dt
                      className="text-xs font-medium"
                      style={{ color: "var(--guest-text-muted)" }}
                    >
                      Resident parking
                    </dt>
                    <dd className="mt-0.5 break-words font-mono text-sm font-semibold tabular-nums">
                      {parkingSpot}
                    </dd>
                  </div>
                  {hasParking && (
                    <a
                      href="#parking"
                      className="guest-hover-row inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-lg px-2.5 text-xs font-medium underline-offset-4 hover:underline"
                      style={{ color: "var(--guest-accent)" }}
                    >
                      Ramp guide
                    </a>
                  )}
                </div>
              )}

              {wifiName && (
                <div
                  className="flex items-center justify-between gap-3 px-3.5 py-2 sm:px-5 sm:py-2.5"
                  style={{ borderColor: "var(--guest-card-border)" }}
                >
                  <div className="min-w-0">
                    <dt
                      className="text-xs font-medium"
                      style={{ color: "var(--guest-text-muted)" }}
                    >
                      Wi-Fi network
                    </dt>
                    <dd className="mt-0.5 break-words font-mono text-sm font-semibold tabular-nums">
                      {wifiName}
                    </dd>
                  </div>
                  {hasWifi && (
                    <a
                      href="#wifi"
                      className="guest-hover-row inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-lg px-2.5 text-xs font-medium underline-offset-4 hover:underline"
                      style={{ color: "var(--guest-accent)" }}
                    >
                      QR &amp; password
                    </a>
                  )}
                </div>
              )}

              {(formattedCheckin || formattedCheckout) && (
                <div
                  className={`grid ${
                    formattedCheckin && formattedCheckout
                      ? "grid-cols-2 divide-x"
                      : "grid-cols-1"
                  }`}
                  style={{ borderColor: "var(--guest-card-border)" }}
                >
                  {formattedCheckin && (
                    <div className="px-3.5 py-2.5 sm:px-5 sm:py-3">
                      <dt
                        className="text-xs font-medium"
                        style={{ color: "var(--guest-text-muted)" }}
                      >
                        Check-in
                      </dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">
                        {formattedCheckin}
                      </dd>
                    </div>
                  )}
                  {formattedCheckout && (
                    <div
                      className="px-3.5 py-2.5 sm:px-5 sm:py-3"
                      style={{ borderColor: "var(--guest-card-border)" }}
                    >
                      <dt
                        className="text-xs font-medium"
                        style={{ color: "var(--guest-text-muted)" }}
                      >
                        Check-out
                      </dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">
                        {formattedCheckout}
                      </dd>
                    </div>
                  )}
                </div>
              )}
            </dl>
          </aside>
        )}
      </div>
    </header>
  );
}
