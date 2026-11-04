"use client";

import { useState } from "react";
import { SectionHeading } from "@/components/guest/section-heading";
import { UtensilsCrossed, Bath, Sofa, ChevronDown } from "lucide-react";

interface AmenitiesProps {
  kitchen: string[] | null;
  bathroom: string[] | null;
  general: string[] | null;
}

export function AmenitiesSection({ kitchen, bathroom, general }: AmenitiesProps) {
  const sections = [
    { id: "kitchen", label: "Kitchen", icon: UtensilsCrossed, items: kitchen },
    { id: "bathroom", label: "Bathrooms", icon: Bath, items: bathroom },
    { id: "general", label: "General Amenities", icon: Sofa, items: general },
  ].filter((s) => s.items && s.items.length > 0);

  const [openIds, setOpenIds] = useState<string[]>(() =>
    sections[0] ? [sections[0].id] : [],
  );

  if (sections.length === 0) return null;

  const totalCount = sections.reduce((sum, s) => sum + (s.items?.length ?? 0), 0);

  function toggleSection(id: string) {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  return (
    <div>
      <SectionHeading
        title="Amenities"
        subtitle={`${totalCount} items stocked across kitchen, bath, and living spaces.`}
      />

      <div
        className="divide-y overflow-hidden rounded-2xl border"
        style={{
          background: "var(--guest-card)",
          borderColor: "var(--guest-card-border)",
        }}
      >
        {sections.map(({ id, label, icon: Icon, items }) => {
          const isOpen = openIds.includes(id);
          return (
            <div
              key={id}
              style={{ borderColor: "var(--guest-card-border)" }}
            >
              <button
                type="button"
                onClick={() => toggleSection(id)}
                aria-expanded={isOpen}
                className="guest-hover-row flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-[background-color] duration-150 sm:px-5"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Icon
                    className="h-4 w-4 shrink-0"
                    strokeWidth={1.75}
                    style={{ color: "var(--guest-accent)" }}
                  />
                  <span className="break-words text-sm font-semibold">
                    {label}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2.5">
                  <span
                    className="font-mono text-xs font-medium tabular-nums"
                    style={{ color: "var(--guest-text-muted)" }}
                  >
                    {items!.length}
                  </span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 transition-transform duration-150"
                    strokeWidth={1.75}
                    style={{
                      color: "var(--guest-text-muted)",
                      transform: isOpen ? "rotate(180deg)" : "none",
                    }}
                  />
                </span>
              </button>

              {isOpen && (
                <ul
                  className="grid grid-cols-1 gap-x-4 gap-y-2 border-t px-4 py-3.5 sm:grid-cols-2 sm:px-5"
                  style={{
                    background: "var(--guest-section-bg)",
                    borderColor: "var(--guest-card-border)",
                  }}
                >
                  {items!.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm leading-snug"
                      style={{ color: "var(--guest-text)" }}
                    >
                      <span
                        aria-hidden="true"
                        className="h-1 w-1 shrink-0 rounded-full"
                        style={{ background: "var(--guest-text-muted)" }}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
