import { describe, it, expect } from "vitest";
import { propertyBasicsSchema, propertyAccessSchema, createPropertySchema, createOwnerSchema } from "@/lib/validators";

describe("propertyBasicsSchema", () => {
  it("validates correct input", () => {
    const result = propertyBasicsSchema.safeParse({
      name: "Test Property",
      ownerId: "123e4567-e89b-12d3-a456-426614174000",
      addressStreet: "123 Main St",
      addressCity: "Toronto",
      addressProvince: "ON",
      addressPostal: "M5V 2T6",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = propertyBasicsSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(false);
  });
});

describe("createPropertySchema", () => {
  it("auto-generates slug from name on the combined schema", () => {
    const result = createPropertySchema.safeParse({
      name: "My Cool Place 42",
      ownerId: "123e4567-e89b-12d3-a456-426614174000",
      addressStreet: "123 Main",
      addressCity: "Toronto",
      addressProvince: "ON",
      addressPostal: "M5V 2T6",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe("my-cool-place-42");
    }
  });
});

describe("propertyAccessSchema", () => {
  it("validates check-in steps array", () => {
    const result = propertyAccessSchema.safeParse({
      checkinTime: "15:00",
      checkoutTime: "11:00",
      checkinSteps: [
        { step: 1, title: "Arrive", description: "Park your car" },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("createOwnerSchema", () => {
  it("validates correct owner input", () => {
    const result = createOwnerSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = createOwnerSchema.safeParse({
      name: "John",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});
