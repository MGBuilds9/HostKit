import { SquareParking, ExternalLink } from "lucide-react";

interface ParkingProps {
  spot: string | null;
  instructions: string | null;
  latitude: string | null;
  longitude: string | null;
}

export function ParkingCard({ spot, instructions, latitude, longitude }: ParkingProps) {
  if (!spot && !instructions) return null;

  const mapsUrl = latitude && longitude
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : null;

  return (
    <section>
      <div className="rounded-xl p-5 shadow-sm dark:shadow-none border border-[hsl(var(--guest-card-border))]" style={{ background: "hsl(var(--guest-card))" }}>
        <div className="flex items-center gap-2 mb-3">
          <SquareParking className="h-4 w-4" style={{ color: "hsl(var(--guest-accent))" }} />
          <h3 className="font-semibold">Parking</h3>
        </div>
        {spot && (
          <p className="font-medium mb-2">Spot: {spot}</p>
        )}
        {instructions && (
          <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--guest-text-muted))" }}>{instructions}</p>
        )}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-sm font-medium hover:underline"
            style={{ color: "hsl(var(--guest-accent))" }}
          >
            Open in Maps <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </section>
  );
}
