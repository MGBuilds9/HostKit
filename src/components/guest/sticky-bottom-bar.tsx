import { Phone, AlertTriangle } from "lucide-react";

export function StickyBottomBar({ hostPhone, emergency }: { hostPhone: string | null; emergency: string | null }) {
  return (
    <div className="fixed bottom-0 inset-x-0 bg-[hsl(var(--guest-card))] border-t border-[hsl(var(--guest-card-border))] px-4 py-3 flex gap-3 max-w-lg sm:max-w-2xl lg:max-w-4xl mx-auto">
      {hostPhone && (
        <a
          href={`tel:${hostPhone}`}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--guest-accent))] text-white py-2.5 text-sm font-medium"
        >
          <Phone className="h-4 w-4" /> Call Host
        </a>
      )}
      {emergency && (
        <a
          href={`tel:${emergency}`}
          className="flex items-center justify-center gap-2 rounded-xl bg-red-500 text-white px-4 py-2.5 text-sm font-medium"
        >
          <AlertTriangle className="h-4 w-4" /> SOS
        </a>
      )}
    </div>
  );
}
