import { describe, it, expect } from "vitest";
import * as schema from "@/db/schema";

describe("schema exports", () => {
  it("exports all required tables", () => {
    expect(schema.users).toBeDefined();
    expect(schema.accounts).toBeDefined();
    expect(schema.sessions).toBeDefined();
    expect(schema.verificationTokens).toBeDefined();
    expect(schema.owners).toBeDefined();
    expect(schema.properties).toBeDefined();
    expect(schema.messageTemplates).toBeDefined();
    expect(schema.checklistTemplates).toBeDefined();
    expect(schema.turnovers).toBeDefined();
  });

  it("exports userRoleEnum with correct values", () => {
    expect(schema.userRoleEnum.enumValues).toEqual(["admin", "owner", "manager", "cleaner"]);
  });

  it("properties table has slug column", () => {
    const slugCol = schema.properties.slug;
    expect(slugCol).toBeDefined();
  });

  it("exports all extended tables", () => {
    expect(schema.cleaners).toBeDefined();
    expect(schema.stays).toBeDefined();
    expect(schema.cleaningTasks).toBeDefined();
    expect(schema.notifications).toBeDefined();
    expect(schema.syncLog).toBeDefined();
  });
});
