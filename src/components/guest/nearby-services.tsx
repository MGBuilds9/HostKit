"use client";

import { useState } from "react";
import { Phone, Navigation } from "lucide-react";

interface Service {
  name: string;
  category: string;
  address?: string;
  distance?: string;
  googleMapsUrl?: string;
  phone?: string;
  notes?: string;
}

const categoryLabels: Record<string, string> = {
  grocery: "Grocery",
  restaurant: "Food",
  pharmacy: "Pharmacy",
  hospital: "Hospital",
  transit: "Transit",
  gas: "Gas",
  gym: "Gym",
  park: "Park",
  entertainment: "Entertainment",
  other: "Other",
};

export function NearbyServices({ services }: { services: Service[] }) {
  const categories = Array.from(new Set(services.map(s => s.category)));
  const [activeCategory, setActiveCategory] = useState(categories[0]);

  const filtered = services.filter(s => s.category === activeCategory);

  return (
    <section>
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold mb-3">Nearby</h2>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "text-white"
                : "hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            style={
              activeCategory === cat
                ? { background: "hsl(var(--guest-accent))" }
                : { background: "hsl(var(--guest-section-bg))", color: "hsl(var(--guest-text-muted))" }
            }
          >
            {categoryLabels[cat] ?? cat}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {filtered.map((svc) => (
          <div key={svc.name + svc.category} className="rounded-xl p-4 border border-[hsl(var(--guest-card-border))] shadow-sm dark:shadow-none" style={{ background: "hsl(var(--guest-card))" }}>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-sm">{svc.name}</h4>
                {svc.distance && (
                  <p className="text-xs mt-0.5" style={{ color: "hsl(var(--guest-text-muted))" }}>{svc.distance}</p>
                )}
                {svc.notes && (
                  <p className="text-xs mt-1" style={{ color: "hsl(var(--guest-text-muted))" }}>{svc.notes}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-3">
              {svc.googleMapsUrl && (
                <a href={svc.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1 text-xs font-medium"
                   style={{ color: "hsl(var(--guest-accent))" }}>
                  <Navigation className="h-3 w-3" /> Directions
                </a>
              )}
              {svc.phone && (
                <a href={`tel:${svc.phone}`}
                   className="flex items-center gap-1 text-xs font-medium"
                   style={{ color: "hsl(var(--guest-accent))" }}>
                  <Phone className="h-3 w-3" /> Call
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
