import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "@/lib/safe-callback-url";

describe("safeCallbackUrl", () => {
  it("keeps a same-origin path", () => {
    expect(safeCallbackUrl("/invite/abc")).toBe("/invite/abc");
    expect(safeCallbackUrl("/owner/properties/1?tab=calendar")).toBe(
      "/owner/properties/1?tab=calendar"
    );
  });

  it("falls back when the value can leave the site", () => {
    expect(safeCallbackUrl(null)).toBe("/admin");
    expect(safeCallbackUrl("")).toBe("/admin");
    expect(safeCallbackUrl("https://evil.example/phish")).toBe("/admin");
    expect(safeCallbackUrl("//evil.example")).toBe("/admin");
    expect(safeCallbackUrl("/\\evil.example")).toBe("/admin");
    expect(safeCallbackUrl("/invite/abc\\@evil")).toBe("/admin");
    expect(safeCallbackUrl("/invite/abc\nSet-Cookie: x")).toBe("/admin");
    expect(safeCallbackUrl("/invite/abc\r\nLocation: https://evil")).toBe("/admin");
  });

  it("uses a caller-supplied fallback", () => {
    expect(safeCallbackUrl("https://evil.example", "/login")).toBe("/login");
  });
});
