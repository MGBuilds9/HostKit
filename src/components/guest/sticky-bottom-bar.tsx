import { Phone, AlertTriangle } from "lucide-react";

export function StickyBottomBar({ hostPhone, emergency }: { hostPhone: string | null; emergency: string | null }) {
  return (
    <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 flex gap-3 max-w-lg mx-auto">
      {hostPhone && (
        <a
          href={`tel:${hostPhone}`}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white py-2.5 text-sm font-medium"
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
