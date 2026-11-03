import Image from "next/image";
import { SquareParking, ExternalLink } from "lucide-react";

interface ParkingProps {
  spot: string | null;
  instructions: string | null;
  latitude: string | null;
  longitude: string | null;
  imageUrl?: string | null;
}

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
    <section>
      <div
        className="rounded-xl p-5 shadow-sm dark:shadow-none border border-[var(--guest-card-border)] space-y-3"
        style={{ background: "var(--guest-card)" }}
      >
        <div className="flex items-center gap-2">
          <SquareParking className="h-4 w-4" style={{ color: "var(--guest-accent)" }} />
          <h3 className="font-semibold">Parking</h3>
        </div>
        {spot && <p className="font-medium">Spot: {spot}</p>}
        {instructions && (
          <p className="text-sm leading-relaxed" style={{ color: "var(--guest-text-muted)" }}>
            {instructions}
          </p>
        )}
        {imageUrl && (
          <div
            className="overflow-hidden rounded-xl border border-[var(--guest-card-border)]"
            style={{ background: "var(--guest-section-bg)" }}
          >
            <Image
              src={imageUrl}
              alt={spot ? `Ramp to ${spot}` : "Resident parking gate and ramp"}
              width={600}
              height={800}
              unoptimized={imageUrl.startsWith("/guide-media/")}
              className="w-full max-h-80 object-contain"
            />
          </div>
        )}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 pt-1 text-sm font-medium hover:underline"
            style={{ color: "var(--guest-accent)" }}
          >
            Open in Maps <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </section>
  );
}
