import type { CSSProperties } from "react";
import Image from "next/image";
import { SquareParking, ExternalLink } from "lucide-react";
import { CopyButton } from "@/components/guest/copy-button";

interface ParkingProps {
  spot: string | null;
  instructions: string | null;
  latitude: string | null;
  longitude: string | null;
  imageUrl?: string | null;
}

type SurfaceVars = CSSProperties & {
  "--guest-ctl-bg"?: string;
  "--guest-ctl-border"?: string;
  "--guest-ctl-fg"?: string;
};

export function ParkingCard({
  spot,
  instructions,
  latitude,
  longitude,
  imageUrl,
}: ParkingProps) {
  if (!spot && !instructions) return null;

  const mapsUrl =
    latitude && longitude
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      : null;

  return (
    <div>
      <div className="mb-3.5 flex flex-col">
        <div className="flex items-center gap-2">
          <SquareParking
            className="h-4 w-4 shrink-0"
            strokeWidth={1.75}
            style={{ color: "var(--guest-accent)" }}
          />
          <h2
            className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold tracking-tight not-italic"
            style={{ overflowWrap: "anywhere", minWidth: 0 }}
          >
            Parking
          </h2>
        </div>
      </div>

      <div
        className="divide-y overflow-hidden rounded-2xl border"
        style={{
          background: "var(--guest-card)",
          borderColor: "var(--guest-card-border)",
        }}
      >
        {spot && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <span
                className="block text-xs font-medium"
                style={{ color: "var(--guest-text-muted)" }}
              >
                Assigned stall
              </span>
              <span className="mt-0.5 block break-words font-mono text-sm font-semibold tabular-nums">
                {spot}
              </span>
            </div>
            <CopyButton
              value={spot}
              label="Copy spot"
              copiedLabel="Copied"
              ariaLabel={`Copy parking spot ${spot}`}
            />
          </div>
        )}

        {(instructions || mapsUrl) && (
          <div
            className="space-y-3.5 px-4 py-4 sm:px-5"
            style={{ borderColor: "var(--guest-card-border)" }}
          >
            {instructions && (
              <p
                className="max-w-[58ch] text-sm leading-relaxed"
                style={{ color: "var(--guest-text-muted)" }}
              >
                {instructions}
              </p>
            )}

            {mapsUrl && (
              <div>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="guest-control-surface inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 text-xs font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.985]"
                  style={
                    {
                      "--guest-ctl-bg": "var(--guest-section-bg)",
                      "--guest-ctl-border": "var(--guest-control-border)",
                      "--guest-ctl-fg": "var(--guest-text)",
                    } as SurfaceVars
                  }
                >
                  <span>Open garage in Maps</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                </a>
              </div>
            )}
          </div>
        )}

        {imageUrl && (
          <div
            className="px-4 py-3.5 sm:px-5"
            style={{
              background: "var(--guest-section-bg)",
              borderColor: "var(--guest-card-border)",
            }}
          >
            <Image
              src={imageUrl}
              alt={spot ? `Garage ramp to ${spot}` : "Resident parking gate and ramp"}
              width={600}
              height={800}
              unoptimized={imageUrl.startsWith("/guide-media/")}
              className="mx-auto max-h-72 w-full rounded-lg object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}
