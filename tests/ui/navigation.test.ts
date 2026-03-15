import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// isActive logic extracted from bottom-tab-bar.tsx
//
// function isActive(href: string, matchPrefix?: boolean) {
//   if (matchPrefix) return pathname.startsWith(href);
//   if (href === "/admin") return pathname === "/admin";
//   return pathname.startsWith(href);
// }
// ---------------------------------------------------------------------------
function isActiveTabBar(
  pathname: string,
  href: string,
  matchPrefix?: boolean
): boolean {
  if (matchPrefix) return pathname.startsWith(href);
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

// ---------------------------------------------------------------------------
// isActive logic extracted from sidebar.tsx
//
// function isActive(href: string) {
//   if (href === "/admin") return pathname === "/admin";
//   return pathname.startsWith(href);
// }
// ---------------------------------------------------------------------------
function isActiveSidebar(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

// ---------------------------------------------------------------------------
// Bottom tab bar — tabs array from bottom-tab-bar.tsx:
//   { href: "/admin", label: "Dashboard", icon: LayoutDashboard }
//   { href: "/admin/properties", label: "Properties", icon: Building2 }
//   { href: "/admin/turnovers", label: "Turnovers", icon: ClipboardCheck, matchPrefix: true }
//   { href: "/admin/messages", label: "Messages", icon: MessageSquare, matchPrefix: true }
// ---------------------------------------------------------------------------
describe("bottom tab bar - isActive", () => {
  describe("Dashboard tab (/admin — exact match only)", () => {
    it("is active on /admin", () => {
      expect(isActiveTabBar("/admin", "/admin")).toBe(true);
    });

    it("is not active on /admin/properties", () => {
      expect(isActiveTabBar("/admin/properties", "/admin")).toBe(false);
    });

    it("is not active on /admin/turnovers", () => {
      expect(isActiveTabBar("/admin/turnovers", "/admin")).toBe(false);
    });

    it("is not active on /admin/settings", () => {
      expect(isActiveTabBar("/admin/settings", "/admin")).toBe(false);
    });

    it("is not active on /admin/owners", () => {
      expect(isActiveTabBar("/admin/owners", "/admin")).toBe(false);
    });
  });

  describe("Properties tab (/admin/properties — prefix match)", () => {
    it("is active on /admin/properties", () => {
      expect(isActiveTabBar("/admin/properties", "/admin/properties")).toBe(true);
    });

    it("is active on /admin/properties/123", () => {
      expect(isActiveTabBar("/admin/properties/123", "/admin/properties")).toBe(true);
    });

    it("is active on /admin/properties/123/edit", () => {
      expect(
        isActiveTabBar("/admin/properties/123/edit", "/admin/properties")
      ).toBe(true);
    });

    it("is not active on /admin", () => {
      expect(isActiveTabBar("/admin", "/admin/properties")).toBe(false);
    });

    it("is not active on /admin/turnovers", () => {
      expect(isActiveTabBar("/admin/turnovers", "/admin/properties")).toBe(false);
    });
  });

  describe("Turnovers tab (/admin/turnovers — matchPrefix: true)", () => {
    it("is active on /admin/turnovers", () => {
      expect(isActiveTabBar("/admin/turnovers", "/admin/turnovers", true)).toBe(
        true
      );
    });

    it("is active on /admin/turnovers/abc", () => {
      expect(
        isActiveTabBar("/admin/turnovers/abc", "/admin/turnovers", true)
      ).toBe(true);
    });

    it("is active on /admin/turnovers/abc/complete", () => {
      expect(
        isActiveTabBar("/admin/turnovers/abc/complete", "/admin/turnovers", true)
      ).toBe(true);
    });

    it("is not active on /admin", () => {
      expect(isActiveTabBar("/admin", "/admin/turnovers", true)).toBe(false);
    });

    it("is not active on /admin/properties", () => {
      expect(isActiveTabBar("/admin/properties", "/admin/turnovers", true)).toBe(
        false
      );
    });
  });

  describe("Messages tab (/admin/messages — matchPrefix: true)", () => {
    it("is active on /admin/messages", () => {
      expect(isActiveTabBar("/admin/messages", "/admin/messages", true)).toBe(
        true
      );
    });

    it("is active on /admin/messages/xyz", () => {
      expect(
        isActiveTabBar("/admin/messages/xyz", "/admin/messages", true)
      ).toBe(true);
    });

    it("is not active on /admin/turnovers", () => {
      expect(isActiveTabBar("/admin/turnovers", "/admin/messages", true)).toBe(
        false
      );
    });

    it("is not active on /admin/properties", () => {
      expect(isActiveTabBar("/admin/properties", "/admin/messages", true)).toBe(
        false
      );
    });
  });

  describe("cross-tab isolation", () => {
    it("Properties does not activate on /admin/turnovers", () => {
      expect(isActiveTabBar("/admin/turnovers", "/admin/properties")).toBe(false);
    });

    it("Turnovers does not activate on /admin/properties", () => {
      expect(
        isActiveTabBar("/admin/properties", "/admin/turnovers", true)
      ).toBe(false);
    });

    it("Messages does not activate on /admin/properties", () => {
      expect(
        isActiveTabBar("/admin/properties", "/admin/messages", true)
      ).toBe(false);
    });

    it("exactly one tab is active for /admin", () => {
      const tabs = [
        { href: "/admin", matchPrefix: undefined },
        { href: "/admin/properties", matchPrefix: undefined },
        { href: "/admin/turnovers", matchPrefix: true },
        { href: "/admin/messages", matchPrefix: true },
      ];
      const active = tabs.filter((t) =>
        isActiveTabBar("/admin", t.href, t.matchPrefix)
      );
      expect(active).toHaveLength(1);
      expect(active[0].href).toBe("/admin");
    });

    it("exactly one tab is active for /admin/properties", () => {
      const tabs = [
        { href: "/admin", matchPrefix: undefined },
        { href: "/admin/properties", matchPrefix: undefined },
        { href: "/admin/turnovers", matchPrefix: true },
        { href: "/admin/messages", matchPrefix: true },
      ];
      const active = tabs.filter((t) =>
        isActiveTabBar("/admin/properties", t.href, t.matchPrefix)
      );
      expect(active).toHaveLength(1);
      expect(active[0].href).toBe("/admin/properties");
    });

    it("exactly one tab is active for /admin/turnovers/some-id", () => {
      const tabs = [
        { href: "/admin", matchPrefix: undefined },
        { href: "/admin/properties", matchPrefix: undefined },
        { href: "/admin/turnovers", matchPrefix: true as true },
        { href: "/admin/messages", matchPrefix: true as true },
      ];
      const active = tabs.filter((t) =>
        isActiveTabBar("/admin/turnovers/some-id", t.href, t.matchPrefix)
      );
      expect(active).toHaveLength(1);
      expect(active[0].href).toBe("/admin/turnovers");
    });
  });
});

// ---------------------------------------------------------------------------
// Sidebar — groups from sidebar.tsx:
//   Main:     /admin (Dashboard), /admin/properties (Properties)
//   Tools:    /admin/turnovers, /admin/messages
//   Settings: /admin/owners, /admin/templates, /admin/settings
// ---------------------------------------------------------------------------
describe("sidebar - isActive", () => {
  describe("Dashboard link (/admin — exact match)", () => {
    it("is active on /admin", () => {
      expect(isActiveSidebar("/admin", "/admin")).toBe(true);
    });

    it("is not active on /admin/properties", () => {
      expect(isActiveSidebar("/admin/properties", "/admin")).toBe(false);
    });

    it("is not active on /admin/owners", () => {
      expect(isActiveSidebar("/admin/owners", "/admin")).toBe(false);
    });
  });

  describe("Properties link (/admin/properties)", () => {
    it("is active on /admin/properties", () => {
      expect(isActiveSidebar("/admin/properties", "/admin/properties")).toBe(true);
    });

    it("is active on /admin/properties/new", () => {
      expect(isActiveSidebar("/admin/properties/new", "/admin/properties")).toBe(
        true
      );
    });

    it("is not active on /admin", () => {
      expect(isActiveSidebar("/admin", "/admin/properties")).toBe(false);
    });
  });

  describe("Turnovers link (/admin/turnovers)", () => {
    it("is active on /admin/turnovers", () => {
      expect(isActiveSidebar("/admin/turnovers", "/admin/turnovers")).toBe(true);
    });

    it("is active on /admin/turnovers/abc123", () => {
      expect(isActiveSidebar("/admin/turnovers/abc123", "/admin/turnovers")).toBe(
        true
      );
    });
  });

  describe("Messages link (/admin/messages)", () => {
    it("is active on /admin/messages", () => {
      expect(isActiveSidebar("/admin/messages", "/admin/messages")).toBe(true);
    });

    it("is active on /admin/messages/thread-1", () => {
      expect(
        isActiveSidebar("/admin/messages/thread-1", "/admin/messages")
      ).toBe(true);
    });
  });

  describe("Owners link (/admin/owners)", () => {
    it("is active on /admin/owners", () => {
      expect(isActiveSidebar("/admin/owners", "/admin/owners")).toBe(true);
    });

    it("is active on /admin/owners/new", () => {
      expect(isActiveSidebar("/admin/owners/new", "/admin/owners")).toBe(true);
    });

    it("is not active on /admin", () => {
      expect(isActiveSidebar("/admin", "/admin/owners")).toBe(false);
    });
  });

  describe("Templates link (/admin/templates)", () => {
    it("is active on /admin/templates", () => {
      expect(isActiveSidebar("/admin/templates", "/admin/templates")).toBe(true);
    });

    it("is active on /admin/templates/checklist", () => {
      expect(
        isActiveSidebar("/admin/templates/checklist", "/admin/templates")
      ).toBe(true);
    });
  });

  describe("Settings link (/admin/settings)", () => {
    it("is active on /admin/settings", () => {
      expect(isActiveSidebar("/admin/settings", "/admin/settings")).toBe(true);
    });

    it("is not active on /admin", () => {
      expect(isActiveSidebar("/admin", "/admin/settings")).toBe(false);
    });
  });

  describe("cross-link isolation", () => {
    it("Owners does not activate on /admin/settings", () => {
      expect(isActiveSidebar("/admin/settings", "/admin/owners")).toBe(false);
    });

    it("Settings does not activate on /admin/owners", () => {
      expect(isActiveSidebar("/admin/owners", "/admin/settings")).toBe(false);
    });

    it("Templates does not activate on /admin/owners", () => {
      expect(isActiveSidebar("/admin/owners", "/admin/templates")).toBe(false);
    });
  });
});
