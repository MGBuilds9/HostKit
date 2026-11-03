import { describe, it, expect } from "vitest";
import {
  renderTemplate,
  extractVariables,
  buildVariablesFromProperty,
} from "@/lib/template-engine";

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

describe("buildVariablesFromProperty", () => {
  it("populates parkingInstructions and guestAccessCode without [missing] placeholders", () => {
    const vars = buildVariablesFromProperty(
      {
        name: "Kith 1423",
        slug: "kith-1423",
        wifiName: "MG-1423",
        wifiPassword: "Welcome123!/@",
        parkingSpot: "P3-257",
        parkingInstructions:
          "Once inside the garage after the first ramp, go down two more ramps to Level P3 and park in Spot 257.",
        guestAccessCode: "KITH-2485",
        buzzerName: "GUIRGUIS, M",
        checkinTime: "15:00",
        thermostatDefault: "22°C",
      },
      "Michael Guirguis",
      "Alex",
    );

    const rendered = renderTemplate(
      "Spot {{property.parkingSpot}}: {{property.parkingInstructions}} | Guide: {{property.guideUrl}} (Code: {{property.guestAccessCode}})",
      vars,
    );

    expect(rendered).not.toContain("[missing]");
    expect(rendered).toContain("P3-257");
    expect(rendered).toContain("go down two more ramps to Level P3 and park in Spot 257");
    expect(rendered).toContain("Code: KITH-2485");
  });

  it("falls back cleanly when guestAccessCode and parkingInstructions are null on public properties", () => {
    const vars = buildVariablesFromProperty(
      {
        name: "Public Loft",
        slug: "public-loft",
        guestAccessCode: null,
        parkingInstructions: null,
      },
      "Host",
      "Taylor",
    );

    const rendered = renderTemplate(
      "Guide: {{property.guideUrl}} | Access code: {{property.guestAccessCode}} | {{property.parkingInstructions}}",
      vars,
    );

    expect(rendered).not.toContain("[missing]");
    expect(rendered).toContain("Access code: None required (direct link)");
  });
});
