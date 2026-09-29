"use client";

import { useEffect, useState } from "react";

const SECTIONS: { id: string; label: string }[] = [
  { id: "arrival", label: "Arrival" },
  { id: "wifi", label: "Wi-Fi" },
  { id: "parking", label: "Parking" },
  { id: "rules", label: "Rules" },
  { id: "included", label: "Included" },
  { id: "nearby", label: "Nearby" },
  { id: "checkout", label: "Check-out" },
  { id: "emergency", label: "Emergency" },
];

export function GuideJumpNav() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    // Smooth in-page scrolling for the anchor links (scoped to the guest guide).
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 }
    );
    const targets = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Guide sections"
      className="sticky top-0 z-30 border-b backdrop-blur"
      style={{
        background: "var(--guest-bg)",
        borderColor: "var(--guest-card-border)",
      }}
    >
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-5 sm:px-8">
        {SECTIONS.map((s) => {
          const isActive = active === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={isActive ? "true" : undefined}
              className="flex min-h-[44px] shrink-0 items-center whitespace-nowrap border-b-2 px-2 text-sm font-medium transition-colors"
              style={{
                color: isActive ? "var(--guest-accent)" : "var(--guest-text-muted)",
                borderBottomColor: isActive ? "var(--guest-accent)" : "transparent",
              }}
            >
              {s.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
