"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/guest/theme-toggle";
import {
  resolveJumpNavActiveSection,
  type PinnedNavState,
} from "@/lib/guide-utils";

const SECTIONS: { id: string; label: string }[] = [
  { id: "arrival", label: "Arrival" },
  { id: "wifi", label: "Wi-Fi" },
  { id: "parking", label: "Parking" },
  { id: "stay-guides", label: "Video Guides" },
  { id: "rules", label: "Rules" },
  { id: "included", label: "Amenities" },
  { id: "checkout", label: "Check-out" },
  { id: "nearby", label: "Nearby" },
  { id: "emergency", label: "Emergency" },
];

function findStickyAncestor(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node && node !== document.body) {
    if (window.getComputedStyle(node).position === "sticky") {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function measureSectionFlowTop(el: HTMLElement): { top: number; isSticky: boolean } {
  const stickyAncestor = findStickyAncestor(el);
  if (stickyAncestor && stickyAncestor.parentElement) {
    const bandParent = stickyAncestor.parentElement;
    const bandStyle = window.getComputedStyle(bandParent);
    const bandPadTop = Number.parseFloat(bandStyle.paddingTop || "0") || 0;
    const bandTop = bandParent.getBoundingClientRect().top + window.scrollY + bandPadTop;
    const offsetInsideSticky =
      el.getBoundingClientRect().top - stickyAncestor.getBoundingClientRect().top;
    return {
      top: Math.round(bandTop + offsetInsideSticky),
      isSticky: true,
    };
  }
  return {
    top: Math.round(el.getBoundingClientRect().top + window.scrollY),
    isSticky: false,
  };
}

export function GuideJumpNav({
  initialSectionIds,
}: {
  initialSectionIds?: string[];
}) {
  const initialSections = initialSectionIds
    ? SECTIONS.filter((s) => initialSectionIds.includes(s.id))
    : SECTIONS;

  const [visibleSections, setVisibleSections] = useState(initialSections);
  const [active, setActive] = useState<string>(initialSections[0]?.id ?? "");
  const pinnedRef = useRef<PinnedNavState | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pinSection(id: string) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    pinnedRef.current = {
      id,
      landedScrollY: typeof window !== "undefined" ? window.scrollY : null,
      lockUntilMs: now + 550,
    };
    setActive(id);

    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      if (pinnedRef.current && pinnedRef.current.id === id && typeof window !== "undefined") {
        pinnedRef.current = {
          ...pinnedRef.current,
          landedScrollY: window.scrollY,
        };
      }
    }, 450);
  }

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReducedMotion) {
      document.documentElement.style.scrollBehavior = "smooth";
    }
    return () => {
      document.documentElement.style.scrollBehavior = "";
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const present = SECTIONS.filter((s) => document.getElementById(s.id) !== null);
    setVisibleSections(present);
    if (present.length === 0) return;

    const presentIds = present.map((s) => s.id);

    // Respect initial URL hash if present
    const initialHash = window.location.hash.replace(/^#/, "");
    if (initialHash && presentIds.includes(initialHash)) {
      pinSection(initialHash);
    } else {
      setActive((prev) => (presentIds.includes(prev) ? prev : presentIds[0]!));
    }

    function evaluateActive() {
      const flowTops: Record<string, number> = {};
      const stickySectionIds = new Set<string>();
      for (const id of presentIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const measured = measureSectionFlowTop(el);
        flowTops[id] = measured.top;
        if (measured.isSticky) {
          stickySectionIds.add(id);
        }
      }

      const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
      const resolved = resolveJumpNavActiveSection({
        sectionIds: presentIds,
        flowTops,
        stickySectionIds,
        scrollY: window.scrollY,
        viewportHeight: window.innerHeight,
        scrollHeight: document.documentElement.scrollHeight,
        nowMs,
        pinned: pinnedRef.current,
      });

      pinnedRef.current = resolved.nextPinned;
      if (resolved.activeId) {
        setActive(resolved.activeId);
      }
    }

    function handleHashChange() {
      const targetId = window.location.hash.replace(/^#/, "");
      if (targetId && presentIds.includes(targetId)) {
        pinSection(targetId);
      } else {
        pinnedRef.current = null;
        evaluateActive();
      }
    }

    evaluateActive();
    window.addEventListener("scroll", evaluateActive, { passive: true });
    window.addEventListener("resize", evaluateActive, { passive: true });
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("scroll", evaluateActive);
      window.removeEventListener("resize", evaluateActive);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [initialSectionIds]);

  if (visibleSections.length === 0) {
    return (
      <div className="flex justify-end px-4 pt-3 sm:px-8">
        <ThemeToggle />
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-30 lg:top-3 lg:px-8">
      <nav
        aria-label="Guide sections"
        className="flex items-center justify-between border-b backdrop-blur-md lg:mx-auto lg:w-fit lg:max-w-full lg:rounded-full lg:border lg:px-2"
        style={{
          background: "color-mix(in oklch, var(--guest-card) 92%, transparent)",
          borderColor: "var(--guest-card-border)",
          boxShadow: "var(--shadow-2)",
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-hide pl-4 pr-2 sm:pl-6 lg:pl-2 lg:pr-1">
          {visibleSections.map((s) => {
            const isActive = active === s.id;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => pinSection(s.id)}
                aria-current={isActive ? "location" : undefined}
                className="guest-hover-row relative flex min-h-[44px] shrink-0 items-center whitespace-nowrap px-2.5 text-[13px] font-medium leading-none transition-[color,background-color] duration-150 active:scale-[0.985] lg:rounded-full lg:px-3"
                style={{
                  color: isActive ? "var(--guest-text)" : "var(--guest-text-muted)",
                }}
              >
                <span>{s.label}</span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-2.5 bottom-0 h-[2px] rounded-full transition-opacity duration-150 lg:bottom-1.5"
                  style={{
                    background: "var(--guest-accent)",
                    opacity: isActive ? 1 : 0,
                  }}
                />
              </a>
            );
          })}
        </div>

        <div
          className="flex shrink-0 items-center border-l pl-1 pr-2 sm:pr-4 lg:pr-0.5"
          style={{ borderColor: "var(--guest-card-border)" }}
        >
          <ThemeToggle />
        </div>
      </nav>
    </div>
  );
}
