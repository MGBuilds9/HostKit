import { Phone, Siren } from "lucide-react";
import { SectionHeading } from "@/components/guest/section-heading";

interface Props {
  emergency: string | null;
  hostPhone: string | null;
  ownerPhone: string | null;
}

export function EmergencyContacts({ emergency, hostPhone, ownerPhone }: Props) {
  const contacts = [
    emergency && { label: "Emergency", number: emergency, urgent: true },
    hostPhone && { label: "Your Host", number: hostPhone, urgent: false },
    ownerPhone && { label: "Property Owner", number: ownerPhone, urgent: false },
  ].filter(Boolean) as { label: string; number: string; urgent: boolean }[];

  return (
    <section>
      <SectionHeading title="Emergency Contacts" />
      <div className="space-y-2">
        {contacts.map((c) => (
          <a
            key={c.label}
            href={`tel:${c.number}`}
            className={`flex items-center justify-between rounded-xl p-4 transition-colors ${
              c.urgent
                ? "border hover:opacity-90"
                : "border border-[hsl(var(--guest-card-border))] shadow-sm dark:shadow-none hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            style={
              c.urgent
                ? { background: "hsl(var(--guest-accent-soft))", borderColor: "hsl(var(--guest-danger))" }
                : { background: "hsl(var(--guest-card))" }
            }
          >
            <div className="flex items-center gap-3">
              {c.urgent ? (
                <Siren className="h-4 w-4" style={{ color: "hsl(var(--guest-danger))" }} />
              ) : (
                <Phone className="h-4 w-4" style={{ color: "hsl(var(--guest-text-muted))" }} />
              )}
              <span className="text-sm font-medium">{c.label}</span>
            </div>
            <span
              className={`text-sm font-mono ${c.urgent ? "font-semibold" : ""}`}
              style={c.urgent ? { color: "hsl(var(--guest-danger))" } : { color: "hsl(var(--guest-text-muted))" }}
            >
              {c.number}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
