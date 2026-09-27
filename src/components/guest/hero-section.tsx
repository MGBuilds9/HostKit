import { Clock, Wifi, SquareParking, LogOut } from "lucide-react";

interface HeroProps {
  name: string;
  description: string | null;
  city: string;
  checkinTime?: string;
  checkoutTime?: string;
  wifiName?: string | null;
  parkingSpot?: string | null;
}

function formatTime(time?: string): string {
  if (!time) return "";
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return time;
  }
}

export function HeroSection({
  name,
  description,
  city,
  checkinTime,
  checkoutTime,
  wifiName,
  parkingSpot,
}: HeroProps) {
  // Jacob's Law: guests already expect a key-facts strip (Airbnb/Booking).
  const facts = [
    { icon: Clock, label: "Check-in", value: formatTime(checkinTime), present: !!checkinTime },
    { icon: LogOut, label: "Check-out", value: formatTime(checkoutTime), present: !!checkoutTime },
    { icon: Wifi, label: "Wi-Fi", value: wifiName ?? "", present: !!wifiName },
    { icon: SquareParking, label: "Parking", value: parkingSpot ?? "", present: !!parkingSpot },
  ].filter((f) => f.present);

  return (
    <section
      className="text-white px-6 pt-16 pb-10 md:pt-20 md:pb-12 lg:pt-24 rounded-b-3xl"
      style={{ background: `linear-gradient(to bottom right, hsl(var(--guest-hero-from)), hsl(var(--guest-hero-to)))` }}
    >
      <div className="max-w-4xl mx-auto">
        <p className="text-sm font-medium text-white/70 uppercase tracking-wide">Welcome to</p>
        <h1 className="font-[family-name:var(--font-dm-sans)] text-4xl lg:text-5xl font-bold mt-2">{name}</h1>
        <div className="w-16 h-0.5 mt-4 mb-4" style={{ background: "hsl(var(--guest-accent))" }} />
        <p className="text-white/80 text-lg">{description ?? `Your home away from home in ${city}`}</p>

        {facts.length > 0 && (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {facts.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-3 backdrop-blur-sm"
              >
                <div className="flex items-center gap-1.5 text-white/60">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[11px] uppercase tracking-wide">{label}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
