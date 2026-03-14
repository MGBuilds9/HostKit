import { describe, it, expect } from "vitest";
import { renderTemplate, extractVariables } from "@/lib/template-engine";

describe("renderTemplate", () => {
  it("replaces simple variables", () => {
    const result = renderTemplate("Hello {{guestName}}, welcome to {{property.name}}!", {
      guestName: "Sarah",
      "property.name": "Kith 1423",
    });
    expect(result).toBe("Hello Sarah, welcome to Kith 1423!");
  });

  it("leaves unknown variables as [missing]", () => {
    const result = renderTemplate("WiFi: {{property.wifiName}}", {});
    expect(result).toBe("WiFi: [missing]");
  });

  it("handles empty template", () => {
    expect(renderTemplate("", {})).toBe("");
  });

  it("handles multiple occurrences of same variable", () => {
    const result = renderTemplate("{{name}} is {{name}}", { name: "Kith" });
    expect(result).toBe("Kith is Kith");
  });
});

describe("extractVariables", () => {
  it("extracts all variable names from template", () => {
    const vars = extractVariables("{{a}} and {{b.c}} and {{d}}");
    expect(vars).toEqual(["a", "b.c", "d"]);
  });

  it("returns empty array for no variables", () => {
    expect(extractVariables("no vars here")).toEqual([]);
  });

  it("deduplicates variable names", () => {
    const vars = extractVariables("{{a}} {{a}} {{b}}");
    expect(vars).toEqual(["a", "b"]);
  });
});
