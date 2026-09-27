import { Clock, Wifi, SquareParking, LogOut, MapPin } from "lucide-react";

interface HeroProps {
  name: string;
  description: string | null;
  city: string;
  checkinTime?: string;
  checkoutTime?: string;
  wifiName?: string | null;
  parkingSpot?: string | null;
  addressLine?: string | null;
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
  addressLine,
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
      className="text-white px-6 pt-16 pb-10 md:pt-20 md:pb-12 lg:pt-24 rounded-b-[2rem]"
      style={{ background: `linear-gradient(150deg, hsl(var(--guest-hero-from)), hsl(var(--guest-hero-to)))` }}
    >
      <div className="max-w-4xl mx-auto">
        <p className="text-[13px] font-semibold uppercase tracking-[0.28em] text-white/50">Welcome to</p>
        <h1 className="font-[family-name:var(--font-dm-sans)] text-4xl lg:text-5xl font-bold mt-3 tracking-tight">
          {name}
        </h1>
        {addressLine && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-white/70">
            <MapPin className="h-4 w-4 shrink-0" />
            {addressLine}
          </p>
        )}
        <div className="w-12 h-[3px] mt-5 mb-4 rounded-full" style={{ background: "hsl(var(--guest-accent))" }} />
        <p className="max-w-xl text-white/85 text-lg leading-relaxed">
          {description ?? `Your home away from home in ${city}`}
        </p>

        {facts.length > 0 && (
          <div className="mt-9 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {facts.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3.5 backdrop-blur-sm"
              >
                <div className="flex items-center gap-1.5 text-white/50">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.14em]">{label}</span>
                </div>
                <p className="mt-1.5 truncate text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
