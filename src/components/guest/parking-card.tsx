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
    <section className="px-5">
      <div className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <SquareParking className="h-4 w-4 text-[#FF6B6B]" />
          <h3 className="font-semibold">Parking</h3>
        </div>
        {spot && (
          <p className="font-medium mb-2">Spot: {spot}</p>
        )}
        {instructions && (
          <p className="text-sm text-slate-600 leading-relaxed">{instructions}</p>
        )}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-[#FF6B6B] hover:underline"
          >
            Open in Maps <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </section>
  );
}
