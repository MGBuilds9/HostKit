import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock next/headers cookies() with an in-memory store kept inside the factory.
const store = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      store.has(name) ? { name, value: store.get(name)! } : undefined,
    set: (name: string, value: string) => {
      store.set(name, value);
    },
  }),
}));

// Set the secret directly (the lib reads process.env.NEXTAUTH_SECRET lazily).
process.env.NEXTAUTH_SECRET = "test-secret";

import { isGuideUnlocked, unlockGuide } from "@/lib/guest-access";

describe("guest-access", () => {
  beforeEach(() => {
    store.clear();
  });

  it("treats properties without an access code as public", async () => {
    await expect(isGuideUnlocked("kith-1423", null)).resolves.toBe(true);
  });

  it("rejects a wrong access code and stays locked", async () => {
    const ok = await unlockGuide("kith-1423", "kith1423", "wrong");
    expect(ok).toBe(false);
    await expect(isGuideUnlocked("kith-1423", "kith1423")).resolves.toBe(false);
  });

  it("unlocks with the correct code and stays unlocked", async () => {
    const ok = await unlockGuide("kith-1423", "kith1423", "kith1423");
    expect(ok).toBe(true);
    await expect(isGuideUnlocked("kith-1423", "kith1423")).resolves.toBe(true);
  });

  it("matches codes case-insensitively and trims whitespace", async () => {
    const ok = await unlockGuide("kith-1423", "kith1423", "  KITH1423 ");
    expect(ok).toBe(true);
  });

  it("does not leak unlock across different slugs or codes", async () => {
    await unlockGuide("kith-1423", "kith1423", "kith1423");
    // Different slug, same code → locked.
    await expect(isGuideUnlocked("kith-9999", "kith1423")).resolves.toBe(false);
    // Same slug, different code → locked.
    await expect(isGuideUnlocked("kith-1423", "othercode")).resolves.toBe(false);
  });
});
