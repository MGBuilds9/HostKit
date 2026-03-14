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
    <section className="px-5">
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold mb-3">Nearby</h2>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "bg-[#FF6B6B] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {categoryLabels[cat] ?? cat}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {filtered.map((svc) => (
          <div key={svc.name + svc.category} className="bg-white rounded-xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-sm">{svc.name}</h4>
                {svc.distance && (
                  <p className="text-xs text-slate-400 mt-0.5">{svc.distance}</p>
                )}
                {svc.notes && (
                  <p className="text-xs text-slate-500 mt-1">{svc.notes}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-3">
              {svc.googleMapsUrl && (
                <a href={svc.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1 text-xs font-medium text-[#FF6B6B]">
                  <Navigation className="h-3 w-3" /> Directions
                </a>
              )}
              {svc.phone && (
                <a href={`tel:${svc.phone}`}
                   className="flex items-center gap-1 text-xs font-medium text-[#FF6B6B]">
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
