import Image from "next/image";
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
  imageUrl?: string | null;
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
  imageUrl,
}: HeroProps) {
  // Jacob's Law: split hero (text + photo) matches Airbnb/Booking listing heads.
  const facts = [
    { icon: Clock, label: "Check-in", value: formatTime(checkinTime), present: !!checkinTime },
    { icon: LogOut, label: "Check-out", value: formatTime(checkoutTime), present: !!checkoutTime },
    { icon: Wifi, label: "Wi-Fi", value: wifiName ?? "", present: !!wifiName },
    { icon: SquareParking, label: "Parking", value: parkingSpot ?? "", present: !!parkingSpot },
  ].filter((f) => f.present);

  return (
    <section className="px-5 sm:px-8 pt-8 md:pt-12 lg:pt-14">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Text + facts */}
        <div>
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: "var(--guest-accent)" }}
          >
            Welcome to
          </p>
          <h1 className="font-[family-name:var(--font-dm-sans)] text-3xl sm:text-4xl lg:text-5xl font-bold mt-2 tracking-tight">
            {name}
          </h1>
          {addressLine && (
            <p
              className="mt-3 flex items-center gap-1.5 text-sm"
              style={{ color: "var(--guest-text-muted)" }}
            >
              <MapPin className="h-4 w-4 shrink-0" />
              {addressLine}
            </p>
          )}
          <p
            className="mt-4 max-w-xl text-[15px] leading-relaxed"
            style={{ color: "var(--guest-text-muted)" }}
          >
            {description ?? `Your home away from home in ${city}`}
          </p>

          {facts.length > 0 && (
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              {facts.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-2xl border px-3.5 py-3"
                  style={{
                    background: "var(--guest-card)",
                    borderColor: "var(--guest-card-border)",
                  }}
                >
                  <div
                    className="flex items-center gap-1.5"
                    style={{ color: "var(--guest-text-muted)" }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: "var(--guest-accent)" }} />
                    <span className="text-[10.5px] font-medium uppercase tracking-[0.14em]">
                      {label}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Photo */}
        {imageUrl && (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-[var(--guest-card-border)] shadow-sm dark:shadow-none">
            <Image
              src={imageUrl}
              alt={`Arrival at ${name}`}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
        )}
      </div>
    </section>
  );
}
