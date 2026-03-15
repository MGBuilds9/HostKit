import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const cssPath = resolve(__dirname, "../../src/app/globals.css");
const cssContent = readFileSync(cssPath, "utf-8");

// Extract CSS custom property names from a selector block.
// Uses simple indexOf string search to avoid complex regex literals that
// trip the oxc parser used by Vite 8 / Vitest 4.
function extractVariables(css: string, selector: string): string[] {
  const blockStart = css.indexOf(selector);
  if (blockStart === -1) return [];
  const openBrace = css.indexOf("{", blockStart);
  if (openBrace === -1) return [];
  const closeBrace = css.indexOf("}", openBrace);
  if (closeBrace === -1) return [];
  const block = css.slice(openBrace + 1, closeBrace);
  const vars: string[] = [];
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--")) {
      const name = trimmed.split(":")[0].trim();
      if (name.startsWith("--")) vars.push(name);
    }
  }
  return vars;
}

const rootVars = extractVariables(cssContent, ":root");
const darkVars = extractVariables(cssContent, ".dark");

// ---------------------------------------------------------------------------
// :root — light mode
// ---------------------------------------------------------------------------
describe("CSS variables - light mode (:root)", () => {
  it("parses :root block without error (block is non-empty)", () => {
    expect(rootVars.length).toBeGreaterThan(0);
  });

  it("defines all shadcn/ui base variables", () => {
    const required = [
      "--background", "--foreground",
      "--card", "--card-foreground",
      "--popover", "--popover-foreground",
      "--primary", "--primary-foreground",
      "--secondary", "--secondary-foreground",
      "--muted", "--muted-foreground",
      "--accent", "--accent-foreground",
      "--destructive", "--destructive-foreground",
      "--border", "--input", "--ring", "--radius",
    ];
    for (const v of required) {
      expect(rootVars, "Missing " + v + " in :root").toContain(v);
    }
  });

  it("defines all guest guide semantic variables", () => {
    const guestVars = [
      "--guest-accent", "--guest-accent-soft",
      "--guest-hero-from", "--guest-hero-to",
      "--guest-bg", "--guest-card", "--guest-card-border",
      "--guest-text", "--guest-text-muted", "--guest-section-bg",
    ];
    for (const v of guestVars) {
      expect(rootVars, "Missing " + v + " in :root").toContain(v);
    }
  });

  it("defines chart variables (--chart-1 through --chart-5)", () => {
    for (let i = 1; i <= 5; i++) {
      expect(rootVars, "Missing --chart-" + i + " in :root").toContain("--chart-" + i);
    }
  });

  it("each variable appears exactly once in :root", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const v of rootVars) {
      if (seen.has(v)) duplicates.push(v);
      seen.add(v);
    }
    expect(duplicates).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// .dark — dark mode overrides
// ---------------------------------------------------------------------------
describe("CSS variables - dark mode (.dark)", () => {
  it("parses .dark block without error (block is non-empty)", () => {
    expect(darkVars.length).toBeGreaterThan(0);
  });

  it("defines all shadcn/ui base variables for dark mode", () => {
    const required = [
      "--background", "--foreground",
      "--card", "--card-foreground",
      "--primary", "--primary-foreground",
      "--secondary", "--secondary-foreground",
      "--muted", "--muted-foreground",
      "--accent", "--accent-foreground",
      "--destructive", "--destructive-foreground",
      "--border", "--input", "--ring",
    ];
    for (const v of required) {
      expect(darkVars, "Missing " + v + " in .dark").toContain(v);
    }
  });

  it("defines all guest guide semantic variables for dark mode", () => {
    const guestVars = [
      "--guest-accent", "--guest-accent-soft",
      "--guest-hero-from", "--guest-hero-to",
      "--guest-bg", "--guest-card", "--guest-card-border",
      "--guest-text", "--guest-text-muted", "--guest-section-bg",
    ];
    for (const v of guestVars) {
      expect(darkVars, "Missing " + v + " in .dark").toContain(v);
    }
  });

  it("defines chart variables for dark mode (--chart-1 through --chart-5)", () => {
    for (let i = 1; i <= 5; i++) {
      expect(darkVars, "Missing --chart-" + i + " in .dark").toContain("--chart-" + i);
    }
  });

  it("light and dark mode define the same guest variable set", () => {
    const rootGuest = rootVars.filter((v) => v.startsWith("--guest-")).sort();
    const darkGuest = darkVars.filter((v) => v.startsWith("--guest-")).sort();
    expect(darkGuest).toEqual(rootGuest);
  });

  it("dark mode overrides all shadcn color variables defined in :root", () => {
    const shadcnColors = rootVars.filter(
      (v) => !v.startsWith("--guest-") && !v.startsWith("--chart-") && v !== "--radius"
    );
    for (const v of shadcnColors) {
      expect(darkVars, v + " in :root but missing from .dark").toContain(v);
    }
  });

  it("each variable appears exactly once in .dark", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const v of darkVars) {
      if (seen.has(v)) duplicates.push(v);
      seen.add(v);
    }
    expect(duplicates).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Raw CSS sanity checks
// ---------------------------------------------------------------------------
describe("globals.css - structural sanity", () => {
  it("imports Tailwind base, components, and utilities", () => {
    expect(cssContent).toContain("@tailwind base");
    expect(cssContent).toContain("@tailwind components");
    expect(cssContent).toContain("@tailwind utilities");
  });

  it("uses @layer base for variable definitions", () => {
    expect(cssContent).toContain("@layer base");
  });

  it("contains the .scrollbar-hide utility class", () => {
    expect(cssContent).toContain(".scrollbar-hide");
  });

  it("does not contain any hardcoded #FF6B6B color values", () => {
    expect(cssContent).not.toContain("#FF6B6B");
    expect(cssContent).not.toContain("#ff6b6b");
  });
});
