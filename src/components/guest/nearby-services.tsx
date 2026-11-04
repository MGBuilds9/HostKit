"use client";

import { useState, type CSSProperties } from "react";
import { Phone, Navigation } from "lucide-react";
import { SectionHeading } from "@/components/guest/section-heading";
import { normalizeDialablePhone } from "@/lib/guide-utils";

interface Service {
  name: string;
  category: string;
  address?: string;
  distance?: string;
  googleMapsUrl?: string;
  phone?: string;
  notes?: string;
}

type SurfaceVars = CSSProperties & {
  "--guest-ctl-bg"?: string;
  "--guest-ctl-border"?: string;
  "--guest-ctl-fg"?: string;
};

const categoryLabels: Record<string, string> = {
  grocery: "Grocery",
  restaurant: "Food & Coffee",
  pharmacy: "Pharmacy",
  hospital: "Hospital",
  transit: "Transit",
  gas: "Gas",
  gym: "Gym",
  park: "Parks",
  entertainment: "Entertainment",
  other: "Other",
};

export function NearbyServices({ services }: { services: Service[] }) {
  const categories = Array.from(new Set(services.map((s) => s.category)));
  const [activeCategory, setActiveCategory] = useState(categories[0]);

  if (services.length === 0) return null;

  const filtered = services.filter((s) => s.category === activeCategory);

  return (
    <div>
      <SectionHeading
        title="Nearby Places"
        subtitle="Groceries, coffee, dining, and transit within a few minutes."
      />

      <div
        role="group"
        aria-label="Filter nearby places by category"
        className="flex gap-1.5 overflow-x-auto pb-2.5 scrollbar-hide"
      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveCategory(cat)}
              className={`${
                isActive ? "hover:opacity-90" : "guest-control-surface"
              } inline-flex min-h-[44px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3.5 text-xs font-semibold transition-[background-color,border-color,color,transform,opacity] duration-150 active:scale-[0.985]`}
              style={
                isActive
                  ? {
                      background: "var(--guest-cta-bg)",
                      borderColor: "var(--guest-cta-bg)",
                      color: "var(--guest-cta-ink)",
                    }
                  : ({
                      "--guest-ctl-bg": "var(--guest-card)",
                      "--guest-ctl-border": "var(--guest-control-border)",
                      "--guest-ctl-fg": "var(--guest-text)",
                    } as SurfaceVars)
              }
            >
              {categoryLabels[cat] ?? cat}
            </button>
          );
        })}
      </div>

      <div
        className="divide-y overflow-hidden rounded-2xl border"
        style={{
          background: "var(--guest-card)",
          borderColor: "var(--guest-card-border)",
        }}
      >
        {filtered.map((svc) => {
          const dialablePhone = normalizeDialablePhone(svc.phone);
          const actionVars: SurfaceVars = {
            "--guest-ctl-bg": "var(--guest-section-bg)",
            "--guest-ctl-border": "var(--guest-control-border)",
            "--guest-ctl-fg": "var(--guest-text)",
          };
          return (
            <div
              key={svc.name + svc.category}
              className="px-4 py-3.5 sm:px-5"
              style={{ borderColor: "var(--guest-card-border)" }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="min-w-0 text-sm font-semibold leading-snug">
                  {svc.name}
                </h3>
                {svc.distance && (
                  <span
                    className="shrink-0 font-mono text-xs tabular-nums"
                    style={{ color: "var(--guest-text-muted)" }}
                  >
                    {svc.distance}
                  </span>
                )}
              </div>
              {svc.notes && (
                <p
                  className="mt-1 text-xs leading-relaxed"
                  style={{ color: "var(--guest-text-muted)" }}
                >
                  {svc.notes}
                </p>
              )}
              {(svc.googleMapsUrl || dialablePhone) && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {svc.googleMapsUrl && (
                    <a
                      href={svc.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="guest-control-surface inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.985]"
                      style={actionVars}
                    >
                      <Navigation
                        className="h-3.5 w-3.5 shrink-0"
                        strokeWidth={1.75}
                        style={{ color: "var(--guest-accent)" }}
                      />
                      <span>Directions</span>
                    </a>
                  )}
                  {dialablePhone && (
                    <a
                      href={dialablePhone.href}
                      className="guest-control-surface inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.985]"
                      style={actionVars}
                    >
                      <Phone
                        className="h-3.5 w-3.5 shrink-0"
                        strokeWidth={1.75}
                        style={{ color: "var(--guest-accent)" }}
                      />
                      <span>Call</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
