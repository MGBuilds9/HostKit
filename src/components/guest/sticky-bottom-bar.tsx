import { Phone, AlertTriangle } from "lucide-react";

export function StickyBottomBar({ hostPhone, emergency }: { hostPhone: string | null; emergency: string | null }) {
  return (
    <div className="fixed bottom-0 inset-x-0 bg-[hsl(var(--guest-card))]/95 backdrop-blur-sm border-t border-[hsl(var(--guest-card-border))] px-4 py-3 flex gap-3 max-w-lg sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.15)]">
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
          className="flex items-center justify-center gap-2 rounded-xl text-white px-4 py-2.5 text-sm font-medium"
          style={{ background: "hsl(var(--guest-danger))" }}
        >
          <AlertTriangle className="h-4 w-4" /> SOS
        </a>
      )}
    </div>
  );
}
