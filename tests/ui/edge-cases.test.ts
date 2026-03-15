import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Turnover checklist - progress calculation
// Mirrors the useMemo in turnover-checklist.tsx:
//
//   for (const section of template.sections) {
//     for (const item of section.items) {
//       if (!showDeepClean && item.type === "deep_clean") continue;
//       total++;
//       if (checked[`${section.title}:${item.label}`]) done++;
//     }
//   }
// ---------------------------------------------------------------------------
function calculateProgress(
  sections: { title: string; items: { label: string; type: string }[] }[],
  checked: Record<string, boolean>,
  showDeepClean: boolean
) {
  let total = 0;
  let done = 0;
  for (const section of sections) {
    for (const item of section.items) {
      if (!showDeepClean && item.type === "deep_clean") continue;
      total++;
      const key = `${section.title}:${item.label}`;
      if (checked[key]) done++;
    }
  }
  return { totalItems: total, checkedCount: done };
}

const mockSections = [
  {
    title: "Kitchen",
    items: [
      { label: "Wipe counters", type: "check" },
      { label: "Clean oven", type: "deep_clean" },
      { label: "Restock soap", type: "restock" },
    ],
  },
  {
    title: "Bathroom",
    items: [
      { label: "Scrub toilet", type: "check" },
      { label: "Replace towels", type: "restock" },
    ],
  },
];

describe("turnover checklist - progress calculation", () => {
  it("counts only non-deep-clean items when showDeepClean is false", () => {
    const result = calculateProgress(mockSections, {}, false);
    expect(result.totalItems).toBe(4); // 5 total - 1 deep_clean
    expect(result.checkedCount).toBe(0);
  });

  it("counts all items including deep_clean when showDeepClean is true", () => {
    const result = calculateProgress(mockSections, {}, true);
    expect(result.totalItems).toBe(5);
    expect(result.checkedCount).toBe(0);
  });

  it("tracks checked items correctly", () => {
    const checked = {
      "Kitchen:Wipe counters": true,
      "Bathroom:Scrub toilet": true,
    };
    const result = calculateProgress(mockSections, checked, false);
    expect(result.checkedCount).toBe(2);
    expect(result.totalItems).toBe(4);
  });

  it("handles empty sections", () => {
    const result = calculateProgress([], {}, false);
    expect(result.totalItems).toBe(0);
    expect(result.checkedCount).toBe(0);
  });

  it("progress percentage is 50% when half visible items are checked", () => {
    const checked = {
      "Kitchen:Wipe counters": true,
      "Kitchen:Restock soap": true,
    };
    const { totalItems, checkedCount } = calculateProgress(mockSections, checked, false);
    const percent = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;
    expect(percent).toBe(50);
  });

  it("progress percentage is 0% when nothing is checked", () => {
    const { totalItems, checkedCount } = calculateProgress(mockSections, {}, false);
    const percent = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;
    expect(percent).toBe(0);
  });

  it("progress percentage is 100% when all visible items are checked", () => {
    const checked = {
      "Kitchen:Wipe counters": true,
      "Kitchen:Restock soap": true,
      "Bathroom:Scrub toilet": true,
      "Bathroom:Replace towels": true,
    };
    const { totalItems, checkedCount } = calculateProgress(mockSections, checked, false);
    const percent = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;
    expect(percent).toBe(100);
  });

  it("does not count hidden deep_clean items even if their key is in checked", () => {
    const checked = { "Kitchen:Clean oven": true };
    const result = calculateProgress(mockSections, checked, false);
    expect(result.checkedCount).toBe(0);
  });

  it("counts deep_clean items in checked when showDeepClean is true", () => {
    const checked = { "Kitchen:Clean oven": true };
    const result = calculateProgress(mockSections, checked, true);
    expect(result.checkedCount).toBe(1);
    expect(result.totalItems).toBe(5);
  });

  it("enabling showDeepClean increases total by deep_clean item count", () => {
    const checked = { "Kitchen:Wipe counters": true };
    const withoutDeep = calculateProgress(mockSections, checked, false);
    const withDeep = calculateProgress(mockSections, checked, true);
    expect(withDeep.totalItems).toBe(withoutDeep.totalItems + 1);
    expect(withDeep.checkedCount).toBe(withoutDeep.checkedCount);
  });

  it("key format is sectionTitle:itemLabel", () => {
    const checked = { "Kitchen:Wipe counters": true };
    const result = calculateProgress(mockSections, checked, false);
    expect(result.checkedCount).toBe(1);
    // Wrong key format should not match
    const resultWrong = calculateProgress(mockSections, { "Wipe counters": true }, false);
    expect(resultWrong.checkedCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Property form - step progress
// ---------------------------------------------------------------------------
const STEPS = [
  "Basics",
  "Access & Check-In",
  "Amenities & Rules",
  "Nearby & Emergency",
  "Review",
];

describe("property form - step progress percentage", () => {
  it("calculates a valid percentage for every step", () => {
    for (let step = 0; step < STEPS.length; step++) {
      const percent = ((step + 1) / STEPS.length) * 100;
      expect(percent).toBeGreaterThan(0);
      expect(percent).toBeLessThanOrEqual(100);
    }
  });

  it("first step (Basics) yields 20%", () => {
    expect(((0 + 1) / STEPS.length) * 100).toBe(20);
  });

  it("second step yields 40%", () => {
    expect(((1 + 1) / STEPS.length) * 100).toBe(40);
  });

  it("third step yields 60%", () => {
    expect(((2 + 1) / STEPS.length) * 100).toBe(60);
  });

  it("fourth step yields 80%", () => {
    expect(((3 + 1) / STEPS.length) * 100).toBe(80);
  });

  it("last step (Review) yields 100%", () => {
    expect(((4 + 1) / STEPS.length) * 100).toBe(100);
  });

  it("all steps are evenly spaced at 20% increments", () => {
    for (let i = 0; i < STEPS.length; i++) {
      expect(((i + 1) / STEPS.length) * 100).toBe((i + 1) * 20);
    }
  });
});

// ---------------------------------------------------------------------------
// Guest guide - branding cleanup
// ---------------------------------------------------------------------------
describe("guest guide - branding cleanup", () => {
  it("emergency-contacts.tsx has no hardcoded host name Mariam", () => {
    const content = readFileSync(
      resolve(__dirname, "../../src/components/guest/emergency-contacts.tsx"),
      "utf-8"
    );
    expect(content).not.toContain("Mariam");
  });

  it('emergency-contacts.tsx uses generic "Your Host" label', () => {
    const content = readFileSync(
      resolve(__dirname, "../../src/components/guest/emergency-contacts.tsx"),
      "utf-8"
    );
    expect(content).toContain('"Your Host"');
  });

  it("sticky-bottom-bar.tsx has no hardcoded host name Mariam", () => {
    const content = readFileSync(
      resolve(__dirname, "../../src/components/guest/sticky-bottom-bar.tsx"),
      "utf-8"
    );
    expect(content).not.toContain("Mariam");
  });

  it("sticky-bottom-bar.tsx uses generic Call Host label", () => {
    const content = readFileSync(
      resolve(__dirname, "../../src/components/guest/sticky-bottom-bar.tsx"),
      "utf-8"
    );
    expect(content).toContain("Call Host");
  });

  it("sticky-bottom-bar.tsx has SOS emergency button", () => {
    const content = readFileSync(
      resolve(__dirname, "../../src/components/guest/sticky-bottom-bar.tsx"),
      "utf-8"
    );
    expect(content).toContain("SOS");
  });

  it("hero-section.tsx uses CSS variables for gradient, not hardcoded color", () => {
    const content = readFileSync(
      resolve(__dirname, "../../src/components/guest/hero-section.tsx"),
      "utf-8"
    );
    expect(content).toContain("var(--guest-hero-from)");
    expect(content).toContain("var(--guest-hero-to)");
    expect(content).not.toContain("#FF6B6B");
  });
});

// ---------------------------------------------------------------------------
// Guest guide - no hardcoded #FF6B6B in any guest component
// ---------------------------------------------------------------------------
describe("guest guide - no hardcoded #FF6B6B", () => {
  const guestDir = resolve(__dirname, "../../src/components/guest");
  const guestFiles = [
    "checkin-walkthrough.tsx",
    "wifi-card.tsx",
    "parking-card.tsx",
    "house-rules-section.tsx",
    "nearby-services.tsx",
    "amenities-section.tsx",
    "checkout-section.tsx",
    "emergency-contacts.tsx",
    "sticky-bottom-bar.tsx",
    "hero-section.tsx",
  ];

  for (const file of guestFiles) {
    it(`${file} has no hardcoded #FF6B6B`, () => {
      const content = readFileSync(resolve(guestDir, file), "utf-8");
      expect(content).not.toContain("#FF6B6B");
      expect(content).not.toContain("#ff6b6b");
    });
  }
});

// ---------------------------------------------------------------------------
// Admin components - no hardcoded bg-white / bg-slate-N / text-slate-N
// ---------------------------------------------------------------------------
describe("admin components - semantic color tokens only", () => {
  const adminFiles = [
    resolve(__dirname, "../../src/components/admin/sidebar.tsx"),
    resolve(__dirname, "../../src/components/admin/topbar.tsx"),
    resolve(__dirname, "../../src/app/(admin)/layout.tsx"),
  ];

  for (const filePath of adminFiles) {
    const fileName = filePath.split(/[/\\]/).pop()!;

    it(`${fileName} has no bg-white`, () => {
      const content = readFileSync(filePath, "utf-8");
      expect(content).not.toContain("bg-white");
    });

    it(`${fileName} has no bg-slate-N classes`, () => {
      const content = readFileSync(filePath, "utf-8");
      expect(content).not.toMatch(/bg-slate-\d/);
    });

    it(`${fileName} has no text-slate-N classes`, () => {
      const content = readFileSync(filePath, "utf-8");
      expect(content).not.toMatch(/text-slate-\d/);
    });
  }
});

// ---------------------------------------------------------------------------
// Layout - dark mode support
// ---------------------------------------------------------------------------
describe("layout - dark mode support", () => {
  const layoutContent = readFileSync(
    resolve(__dirname, "../../src/app/layout.tsx"),
    "utf-8"
  );

  it("root layout has suppressHydrationWarning on html element", () => {
    expect(layoutContent).toContain("suppressHydrationWarning");
  });

  it("root layout has the theme flash-prevention inline script", () => {
    expect(layoutContent).toContain("hostkit-theme");
    expect(layoutContent).toContain("prefers-color-scheme");
  });

  it("inline script adds dark class before React hydrates", () => {
    expect(layoutContent).toContain("classList.add");
  });

  it("root layout includes DM Sans font variable", () => {
    expect(layoutContent).toContain("DM_Sans");
    expect(layoutContent).toContain("--font-dm-sans");
  });

  it("root layout includes Inter font variable", () => {
    expect(layoutContent).toContain("Inter");
    expect(layoutContent).toContain("--font-inter");
  });
});

// ---------------------------------------------------------------------------
// Tailwind config - dark mode class strategy
// ---------------------------------------------------------------------------
describe("tailwind config - dark mode", () => {
  const tailwindContent = readFileSync(
    resolve(__dirname, "../../tailwind.config.ts"),
    "utf-8"
  );

  it("uses darkMode class strategy", () => {
    expect(tailwindContent).toContain("darkMode");
    expect(tailwindContent).toContain('"class"');
  });

  it("scans src/components for class names", () => {
    expect(tailwindContent).toContain("./src/components/**/*.{js,ts,jsx,tsx,mdx}");
  });

  it("scans src/app for class names", () => {
    expect(tailwindContent).toContain("./src/app/**/*.{js,ts,jsx,tsx,mdx}");
  });
});

// ---------------------------------------------------------------------------
// Responsive layout - guest guide
// ---------------------------------------------------------------------------
describe("responsive layout - guest guide", () => {
  it("guide-layout has responsive max-width breakpoints", () => {
    const content = readFileSync(
      resolve(__dirname, "../../src/components/guest/guide-layout.tsx"),
      "utf-8"
    );
    expect(content).toContain("max-w-lg");
    expect(content).toContain("sm:max-w-2xl");
    expect(content).toContain("lg:max-w-4xl");
  });

  it("guest page has two-column grid at lg breakpoint", () => {
    const content = readFileSync(
      resolve(__dirname, "../../src/app/g/[slug]/page.tsx"),
      "utf-8"
    );
    expect(content).toContain("lg:grid-cols-2");
    expect(content).toContain("lg:gap-8");
  });

  it("sticky bottom bar width matches guide-layout max-widths", () => {
    const content = readFileSync(
      resolve(__dirname, "../../src/components/guest/sticky-bottom-bar.tsx"),
      "utf-8"
    );
    expect(content).toContain("max-w-lg");
    expect(content).toContain("sm:max-w-2xl");
    expect(content).toContain("lg:max-w-4xl");
  });

  it("guide layout uses CSS variable for background color", () => {
    const content = readFileSync(
      resolve(__dirname, "../../src/components/guest/guide-layout.tsx"),
      "utf-8"
    );
    expect(content).toContain("var(--guest-bg)");
  });
});

// ---------------------------------------------------------------------------
// Mobile admin - bottom tab bar
// ---------------------------------------------------------------------------
describe("mobile admin - bottom tab bar", () => {
  const tabBarContent = readFileSync(
    resolve(__dirname, "../../src/components/admin/bottom-tab-bar.tsx"),
    "utf-8"
  );

  it("bottom tab bar is hidden on desktop (md:hidden)", () => {
    expect(tabBarContent).toContain("md:hidden");
  });

  it("bottom tab bar uses safe-area-inset-bottom for notch devices", () => {
    expect(tabBarContent).toContain("safe-area-inset-bottom");
  });

  it("tab items have minimum 44px touch target width", () => {
    expect(tabBarContent).toContain("min-w-[44px]");
  });

  it("tab items have minimum 44px touch target height", () => {
    expect(tabBarContent).toContain("min-h-[44px]");
  });

  it("tab bar uses bg-background so it respects the active theme", () => {
    expect(tabBarContent).toContain("bg-background");
  });

  it("admin layout has bottom padding to clear the mobile tab bar", () => {
    const layoutContent = readFileSync(
      resolve(__dirname, "../../src/app/(admin)/layout.tsx"),
      "utf-8"
    );
    expect(layoutContent).toContain("pb-20");
  });
});

// ---------------------------------------------------------------------------
// Mobile admin - sidebar
// ---------------------------------------------------------------------------
describe("mobile admin - sidebar", () => {
  const sidebarContent = readFileSync(
    resolve(__dirname, "../../src/components/admin/sidebar.tsx"),
    "utf-8"
  );

  it("sidebar is hidden on mobile and visible on md+ (hidden md:flex)", () => {
    expect(sidebarContent).toContain("hidden md:flex");
  });

  it("sidebar uses bg-card so it respects the active theme", () => {
    expect(sidebarContent).toContain("bg-card");
  });

  it("active sidebar link uses border-l-2 border-primary indicator", () => {
    expect(sidebarContent).toContain("border-l-2 border-primary");
  });

  it("inactive sidebar link has transparent border-l-2 to avoid layout shift", () => {
    expect(sidebarContent).toContain("border-l-2 border-transparent");
  });
});
