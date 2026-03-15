import { Phone, Siren } from "lucide-react";

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
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold mb-3">Emergency Contacts</h2>
      <div className="space-y-2">
        {contacts.map((c) => (
          <a
            key={c.label}
            href={`tel:${c.number}`}
            className={`flex items-center justify-between rounded-xl p-4 transition-colors ${
              c.urgent
                ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
                : "border border-[hsl(var(--guest-card-border))] shadow-sm dark:shadow-none hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            style={c.urgent ? undefined : { background: "hsl(var(--guest-card))" }}
          >
            <div className="flex items-center gap-3">
              {c.urgent ? (
                <Siren className="h-4 w-4 text-red-500" />
              ) : (
                <Phone className="h-4 w-4" style={{ color: "hsl(var(--guest-text-muted))" }} />
              )}
              <span className="text-sm font-medium">{c.label}</span>
            </div>
            <span
              className={`text-sm font-mono ${c.urgent ? "text-red-600 dark:text-red-400" : ""}`}
              style={c.urgent ? undefined : { color: "hsl(var(--guest-text-muted))" }}
            >
              {c.number}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
