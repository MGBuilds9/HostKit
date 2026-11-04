import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import {
  normalizeDialablePhone,
  formatGuideTime,
  escapeWifiQrField,
  buildWifiQrPayload,
  getSafeLocalStorage,
  parseReadOnlyLoopbackPostgresConfig,
  assertLoopbackDatabaseUrl,
  resolveCopyButtonAriaLabel,
  parseSavedCompletedSteps,
  hydrateAndRepairCompletedSteps,
  transitionVideoLoadState,
  executeCopyWithFallback,
  resolveJumpNavActiveSection,
  resolveBandColumnClasses,
  computeGuideSectionAvailability,
  type StorageLike,
  type VideoPlayerMachineState,
} from "@/lib/guide-utils";
import { EmergencyContacts } from "@/components/guest/emergency-contacts";
import { HeroSection } from "@/components/guest/hero-section";
import { CheckoutSection } from "@/components/guest/checkout-section";
import { HouseRulesSection } from "@/components/guest/house-rules-section";
import { ParkingCard } from "@/components/guest/parking-card";
import { StickyBottomBar } from "@/components/guest/sticky-bottom-bar";
import { CheckinWalkthrough } from "@/components/guest/checkin-walkthrough";
import { GuideJumpNav } from "@/components/guest/guide-jump-nav";
import { NearbyServices } from "@/components/guest/nearby-services";

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike & {
  dump(): Record<string, string>;
} {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    },
    dump: () => Object.fromEntries(store.entries()),
  };
}

describe("guest guide resilience helpers & state controllers", () => {
  describe("normalizeDialablePhone", () => {
    it("rejects empty values, letters, and bracketed seed placeholders", () => {
      expect(normalizeDialablePhone(null)).toBeNull();
      expect(normalizeDialablePhone(undefined)).toBeNull();
      expect(normalizeDialablePhone("   ")).toBeNull();
      expect(normalizeDialablePhone("[MARIAM_PHONE]")).toBeNull();
      expect(normalizeDialablePhone("[MG_PHONE]")).toBeNull();
      expect(normalizeDialablePhone("555-CALL-NOW")).toBeNull();
      expect(normalizeDialablePhone("12")).toBeNull();
    });

    it("accepts 3-digit emergency codes and standard phone numbers", () => {
      expect(normalizeDialablePhone("911")).toEqual({
        display: "911",
        href: "tel:911",
      });
      expect(normalizeDialablePhone("+1 (905) 555-0142")).toEqual({
        display: "+1 (905) 555-0142",
        href: "tel:+19055550142",
      });
    });
  });

  describe("formatGuideTime", () => {
    it("formats valid HH:MM and HH:MM:SS strings and returns null on invalid input", () => {
      expect(formatGuideTime("15:00")).toBe("3:00 PM");
      expect(formatGuideTime("11:00")).toBe("11:00 AM");
      expect(formatGuideTime("00:05")).toBe("12:05 AM");
      expect(formatGuideTime("12:30:00")).toBe("12:30 PM");
      expect(formatGuideTime("")).toBeNull();
      expect(formatGuideTime("25:00")).toBeNull();
      expect(formatGuideTime("TBD")).toBeNull();
    });
  });

  describe("escapeWifiQrField & buildWifiQrPayload", () => {
    it("escapes reserved ZXing WIFI QR characters", () => {
      expect(escapeWifiQrField('MG;1423:"Guest",\\Net')).toBe(
        'MG\\;1423\\:\\"Guest\\"\\,\\\\Net',
      );
      expect(buildWifiQrPayload("MG-1423", "Welcome;123:!")).toBe(
        "WIFI:S:MG-1423;T:WPA;P:Welcome\\;123\\:!;;",
      );
    });
  });

  describe("hydrateAndRepairCompletedSteps", () => {
    const validIds = new Set([1, 2, 3, 4, 5, 6]);
    const key = "hostkit_completed_steps_kith-1423_v2";

    it("removes corrupt or non-array entries from storage and returns []", () => {
      for (const bad of ["null", "{}", "42", "{broken", '[999, "x"]']) {
        const storage = createMemoryStorage({ [key]: bad });
        expect(hydrateAndRepairCompletedSteps(storage, key, validIds)).toEqual([]);
        expect(storage.getItem(key)).toBeNull();
      }
    });

    it("deduplicates and rewrites storage when mixed valid/invalid entries exist", () => {
      const storage = createMemoryStorage({ [key]: '[1, 3, 3, 99, "2"]' });
      expect(hydrateAndRepairCompletedSteps(storage, key, validIds)).toEqual([1, 3]);
      expect(storage.getItem(key)).toBe("[1,3]");
      expect(parseSavedCompletedSteps("[1, 1]", validIds).valid).toBe(false);
    });

    it("catches SecurityError thrown by a blocked window.localStorage getter", () => {
      const blockedWindow = {} as { readonly localStorage: StorageLike };
      Object.defineProperty(blockedWindow, "localStorage", {
        get() {
          throw new Error("SecurityError: The operation is insecure.");
        },
      });
      expect(getSafeLocalStorage(blockedWindow)).toBeNull();
      expect(hydrateAndRepairCompletedSteps(getSafeLocalStorage(blockedWindow), key, validIds)).toEqual([]);
    });
  });

  describe("assertLoopbackDatabaseUrl & resolveCopyButtonAriaLabel", () => {
    it("allows only discrete single-host loopback PostgreSQL configs and rejects multi-host or query overrides", async () => {
      const parsed = parseReadOnlyLoopbackPostgresConfig("postgresql://postgres:pw@127.0.0.1:5432/hostkit");
      expect(parsed.host).toBe("127.0.0.1");
      expect(parsed.port).toBe(5432);
      expect(parsed.database).toBe("hostkit");
      expect(assertLoopbackDatabaseUrl("postgres://postgres:pw@localhost:5432/hostkit").host).toBe("localhost");
      expect(assertLoopbackDatabaseUrl("postgresql://postgres:pw@[::1]:5432/hostkit").host).toBe("::1");

      // Multi-host authority & ambiguous-@ smuggling vectors
      expect(() =>
        parseReadOnlyLoopbackPostgresConfig(
          "postgresql://audit:dummy@192.0.2.10:5432,localhost:5432@localhost:5432/audit",
        ),
      ).toThrow();
      expect(() =>
        parseReadOnlyLoopbackPostgresConfig("postgresql://postgres:pw@127.0.0.1:5432,192.0.2.10:5432/hostkit"),
      ).toThrow();

      // Query parameter override vectors
      expect(() =>
        parseReadOnlyLoopbackPostgresConfig(
          "postgresql://postgres:pw@127.0.0.1:5432/hostkit?default_transaction_read_only=off",
        ),
      ).toThrow();
      expect(() =>
        parseReadOnlyLoopbackPostgresConfig("postgresql://postgres:pw@db.prod.example.com:5432/hostkit"),
      ).toThrow();
      expect(() => parseReadOnlyLoopbackPostgresConfig("")).toThrow();

      // Verify effective postgres driver configuration when constructed from discrete options
      const sql = postgres({
        host: parsed.host,
        port: parsed.port,
        database: parsed.database,
        username: parsed.username,
        password: parsed.password,
        ssl: false,
        max: 1,
        connection: { default_transaction_read_only: true },
      });
      try {
        expect(sql.options.host).toEqual(["127.0.0.1"]);
        expect(sql.options.connection.default_transaction_read_only).toBe(true);
      } finally {
        await sql.end({ timeout: 0 });
      }
    });

    it("preserves WCAG 2.5.3 visible label text inside aria-label across all CopyButton states", () => {
      expect(
        resolveCopyButtonAriaLabel({
          status: "idle",
          label: "Copy name",
          copiedLabel: "Copied",
          ariaLabel: "Copy Wi-Fi network name MG-1423",
        }),
      ).toBe("Copy name — Wi-Fi network name MG-1423");

      expect(
        resolveCopyButtonAriaLabel({
          status: "error",
          label: "Copy Wi-Fi",
          copiedLabel: "Wi-Fi copied",
          ariaLabel: "Copy Wi-Fi password",
        }),
      ).toBe("Retry copy — Wi-Fi password");

      expect(
        resolveCopyButtonAriaLabel({
          status: "copied",
          label: "Copy Wi-Fi",
          copiedLabel: "Wi-Fi copied",
          ariaLabel: "Copy Wi-Fi password",
        }),
      ).toBe("Wi-Fi copied — Wi-Fi password");

      expect(
        resolveCopyButtonAriaLabel({
          status: "pending",
          label: "Copy spot",
          copiedLabel: "Copied",
          ariaLabel: "Copy parking spot P3-257",
        }),
      ).toBe("Copying… — parking spot P3-257");
    });
  });

  describe("transitionVideoLoadState (delayed retry & buffering lifecycle)", () => {
    it("keeps loading indicator active across loadstart and metadata until canplay/playing", () => {
      let state: VideoPlayerMachineState = {
        status: "error",
        pendingPlay: false,
        activeRequestId: 0,
      };

      state = transitionVideoLoadState(state, { type: "retry_requested", requestId: 1 });
      expect(state).toEqual({ status: "loading", pendingPlay: true, activeRequestId: 1 });

      // Stale pause queued by el.load() where el.play() already set el.paused = false must NOT clear loading
      state = transitionVideoLoadState(state, {
        type: "pause",
        isElementPaused: false,
        readyState: 0,
      });
      expect(state).toEqual({ status: "loading", pendingPlay: true, activeRequestId: 1 });

      // loadstart fires when el.load() restarts media fetch — must NOT drop to idle
      state = transitionVideoLoadState(state, { type: "loadstart" });
      expect(state).toEqual({ status: "loading", pendingPlay: true, activeRequestId: 1 });

      // loadedmetadata / durationchange fire at HAVE_METADATA (readyState = 1) — still waiting for frames
      state = transitionVideoLoadState(state, { type: "metadata", readyState: 1 });
      expect(state).toEqual({ status: "loading", pendingPlay: true, activeRequestId: 1 });

      state = transitionVideoLoadState(state, { type: "metadata", readyState: 2 });
      expect(state).toEqual({ status: "loading", pendingPlay: true, activeRequestId: 1 });

      // canplay / playing clear loading once frames can actually play
      state = transitionVideoLoadState(state, { type: "canplay" });
      expect(state).toEqual({ status: "ready", pendingPlay: false, activeRequestId: 1 });

      state = transitionVideoLoadState(state, { type: "playing" });
      expect(state).toEqual({ status: "ready", pendingPlay: false, activeRequestId: 1 });
    });

    it("clears loading immediately on explicit pause during stalled buffering and ignores stale AbortError", () => {
      let state: VideoPlayerMachineState = {
        status: "ready",
        pendingPlay: false,
        activeRequestId: 1,
      };
      state = transitionVideoLoadState(state, { type: "waiting", isPlaying: true });
      expect(state).toEqual({ status: "loading", pendingPlay: true, activeRequestId: 1 });

      // User explicitly pauses while stalled -> clears loading and invalidates requestId
      state = transitionVideoLoadState(state, {
        type: "pause",
        isElementPaused: true,
        readyState: 2,
      });
      expect(state).toEqual({ status: "ready", pendingPlay: false, activeRequestId: 2 });

      // Subsequent AbortError from the cancelled play() promise must not restore loading
      state = transitionVideoLoadState(state, {
        type: "play_rejected",
        requestId: 1,
        aborted: true,
        isElementPaused: true,
        readyState: 2,
        hasMediaError: false,
        notSupported: false,
      });
      expect(state).toEqual({ status: "ready", pendingPlay: false, activeRequestId: 2 });
    });

    it("transitions to error on network/decode error or unsupported playback rejection", () => {
      let state: VideoPlayerMachineState = {
        status: "idle",
        pendingPlay: false,
        activeRequestId: 0,
      };
      state = transitionVideoLoadState(state, {
        type: "play_requested",
        readyState: 0,
        requestId: 1,
      });
      expect(state.status).toBe("loading");

      // AbortError during active retry (isElementPaused: false) does not wipe loading state
      state = transitionVideoLoadState(state, {
        type: "play_rejected",
        requestId: 1,
        aborted: true,
        isElementPaused: false,
        readyState: 0,
        hasMediaError: false,
        notSupported: false,
      });
      expect(state.status).toBe("loading");

      // Real media error surfaces alert
      state = transitionVideoLoadState(state, { type: "error" });
      expect(state).toEqual({ status: "error", pendingPlay: false, activeRequestId: 2 });
    });
  });

  describe("executeCopyWithFallback", () => {
    it("falls back to legacyCopy when clipboard.writeText rejects and auto-resets after 2200ms", async () => {
      const writeText = vi.fn().mockRejectedValueOnce(new Error("NotAllowedError"));
      const legacyCopy = vi.fn().mockReturnValueOnce(true);

      const res = await executeCopyWithFallback({
        value: "Welcome123!/@",
        writeText,
        legacyCopy,
      });

      expect(writeText).toHaveBeenCalledWith("Welcome123!/@");
      expect(legacyCopy).toHaveBeenCalledWith("Welcome123!/@");
      expect(res).toEqual({ ok: true, autoResetMs: 2200 });
    });

    it("returns autoResetMs: null when both copy mechanisms fail so manual recovery never expires", async () => {
      const writeText = vi.fn().mockRejectedValueOnce(new Error("Denied"));
      const legacyCopy = vi.fn().mockReturnValueOnce(false);

      const res = await executeCopyWithFallback({
        value: "GUIRGUIS, M",
        writeText,
        legacyCopy,
      });

      expect(res).toEqual({ ok: false, autoResetMs: null });
    });
  });

  describe("resolveJumpNavActiveSection (two-column desktop & sticky rail)", () => {
    const sectionIds = [
      "arrival",
      "wifi",
      "parking",
      "stay-guides",
      "rules",
      "included",
      "checkout",
      "nearby",
      "emergency",
    ];
    const flowTops = {
      arrival: 520,
      wifi: 520,
      parking: 860,
      "stay-guides": 1700,
      checkout: 1700,
      rules: 2020,
      nearby: 2190,
      included: 2420,
      emergency: 2480,
    };
    const stickyIds = new Set(["wifi", "parking"]);

    it("preserves guest-selected Wi-Fi or Parking pill on desktop alongside tall Arrival column", () => {
      // Guest clicks Parking; smooth scroll lands at scrollY = 780
      const duringLock = resolveJumpNavActiveSection({
        sectionIds,
        flowTops,
        stickySectionIds: stickyIds,
        scrollY: 780,
        viewportHeight: 900,
        scrollHeight: 2900,
        nowMs: 400,
        pinned: { id: "parking", landedScrollY: 500, lockUntilMs: 900 },
      });
      expect(duringLock.activeId).toBe("parking");
      expect(duringLock.nextPinned?.landedScrollY).toBe(780);

      // Lock window expires (nowMs = 2500), guest has NOT scrolled away -> Parking stays active!
      const afterLock = resolveJumpNavActiveSection({
        sectionIds,
        flowTops,
        stickySectionIds: stickyIds,
        scrollY: 792,
        viewportHeight: 900,
        scrollHeight: 2900,
        nowMs: 2500,
        pinned: duringLock.nextPinned,
      });
      expect(afterLock.activeId).toBe("parking");
      expect(afterLock.nextPinned).not.toBeNull();

      // Guest jumps straight back to top (scrollY = 0) -> unpins immediately even inside lock window
      const jumpedTop = resolveJumpNavActiveSection({
        sectionIds,
        flowTops,
        stickySectionIds: stickyIds,
        scrollY: 0,
        viewportHeight: 900,
        scrollHeight: 2900,
        nowMs: 500,
        pinned: duringLock.nextPinned,
      });
      expect(jumpedTop.activeId).toBe("arrival");
      expect(jumpedTop.nextPinned).toBeNull();

      // Guest scrolls >64px manually down into Band 2 -> unpins and tracks free scroll
      const unpinned = resolveJumpNavActiveSection({
        sectionIds,
        flowTops,
        stickySectionIds: stickyIds,
        scrollY: 1620,
        viewportHeight: 900,
        scrollHeight: 2900,
        nowMs: 3200,
        pinned: afterLock.nextPinned,
      });
      expect(unpinned.activeId).toBe("stay-guides");
      expect(unpinned.nextPinned).toBeNull();
    });

    it("does not let sticky right-rail sections hijack Arrival during free desktop scroll", () => {
      const midBand1 = resolveJumpNavActiveSection({
        sectionIds,
        flowTops,
        stickySectionIds: stickyIds,
        scrollY: 920,
        viewportHeight: 900,
        scrollHeight: 2900,
        nowMs: 5000,
        pinned: null,
      });
      expect(midBand1.activeId).toBe("arrival");
    });
  });

  describe("resolveBandColumnClasses & computeGuideSectionAvailability", () => {
    it("omits empty column wrappers and expands lone populated side across 12 columns", () => {
      expect(resolveBandColumnClasses(true, true)).toEqual({
        leftClass: "lg:col-span-7",
        rightClass: "lg:col-span-5",
      });
      expect(resolveBandColumnClasses(true, false)).toEqual({
        leftClass: "lg:col-span-12",
        rightClass: null,
      });
      expect(resolveBandColumnClasses(false, true)).toEqual({
        leftClass: null,
        rightClass: "lg:col-span-12",
      });
      expect(resolveBandColumnClasses(false, false)).toEqual({
        leftClass: null,
        rightClass: null,
      });
    });

    it("computes accurate section availability flags", () => {
      const avail = computeGuideSectionAvailability({
        checkinSteps: [],
        wifiName: "MG-1423",
        wifiPassword: "",
        houseRules: [],
        securityNote: "CCTV in lobby",
        hostPhone: "[MARIAM_PHONE]",
        emergencyContact: "911",
      });
      expect(avail.arrival).toBe(false);
      expect(avail.wifi).toBe(false);
      expect(avail.rules).toBe(true);
      expect(avail.emergency).toBe(true);
    });
  });
});

describe("rendered Guest Guide component output & CSS cascade invariants", () => {
  it("renders EmergencyContacts with concise 320px-safe labels, full accessible names, and no placeholder tel links", () => {
    const html = renderToStaticMarkup(
      React.createElement(EmergencyContacts, {
        hostPhone: "+1 (905) 555-0142",
        ownerPhone: "[MG_PHONE]",
        emergency: "911",
      }),
    );

    expect(html).toContain("Your Host");
    expect(html).toContain("tel:+19055550142");
    expect(html).toContain('aria-label="Emergency Services: 911"');
    expect(html).not.toContain("[MG_PHONE]");
    expect(html).not.toContain("Property Owner<");
    expect(html).toContain("flex-wrap");
  });

  it("renders HeroSection without dead anchors when optional sections are absent and never outputs Invalid Date", () => {
    const html = renderToStaticMarkup(
      React.createElement(HeroSection, {
        name: "Harbour Loft",
        description: null,
        city: "Toronto",
        addressLine: "100 Queens Quay W",
        checkinTime: "15:00",
        checkoutTime: "invalid",
        buzzerName: "SMITH, J",
        parkingSpot: "P2-14",
        wifiName: "LoftNet",
        hasArrival: false,
        hasWifi: false,
        hasParking: false,
        hostPhone: "[MARIAM_PHONE]",
        emergencyContact: "911",
      }),
    );

    expect(html).toContain("Open Maps");
    expect(html).toContain("Copy address");
    expect(html).toContain("3:00 PM");
    expect(html).not.toContain("Invalid Date");
    expect(html).not.toContain('href="#arrival"');
    expect(html).not.toContain('href="#parking"');
    expect(html).not.toContain('href="#wifi"');
    expect(html).not.toContain("Call Host");
    expect(html).toContain("tel:911");
    expect(html).toContain('aria-label="SOS — call emergency services (911)"');
  });

  it("renders CheckoutSection, HouseRulesSection, ParkingCard, StickyBottomBar, GuideJumpNav, CheckinWalkthrough, and NearbyServices cleanly", () => {
    const checkoutHtml = renderToStaticMarkup(
      React.createElement(CheckoutSection, {
        steps: [{ step: 1, title: "Keys", description: "Leave keys on counter" }],
        time: "bad-time",
      }),
    );
    expect(checkoutHtml).not.toContain("Invalid Date");
    expect(checkoutHtml).toContain("Please complete these steps on departure morning.");

    const rulesOnlySecurityHtml = renderToStaticMarkup(
      React.createElement(HouseRulesSection, {
        rules: [],
        securityNote: "Do not contact concierge.",
      }),
    );
    expect(rulesOnlySecurityHtml).not.toContain("<ul");
    expect(rulesOnlySecurityHtml).toContain("Do not contact concierge.");

    const parkingHtml = renderToStaticMarkup(
      React.createElement(ParkingCard, {
        spot: "P3-257",
        instructions: "Go down two more ramps.",
        latitude: "43.5465",
        longitude: "-79.6603",
      }),
    );
    expect(parkingHtml).toContain("Open garage in Maps");

    const stickyEmptyHtml = renderToStaticMarkup(
      React.createElement(StickyBottomBar, {
        hostPhone: "[MARIAM_PHONE]",
        emergency: null,
      }),
    );
    expect(stickyEmptyHtml).toBe("");

    const jumpNavHtml = renderToStaticMarkup(
      React.createElement(GuideJumpNav, {
        initialSectionIds: ["wifi", "emergency"],
      }),
    );
    expect(jumpNavHtml).toContain('href="#wifi"');
    expect(jumpNavHtml).toContain('href="#emergency"');
    expect(jumpNavHtml).not.toContain('href="#arrival"');

    const walkthroughHtml = renderToStaticMarkup(
      React.createElement(CheckinWalkthrough, {
        steps: [
          {
            step: 6,
            title: "P3 elevator to 14th",
            description: "Walk to elevator",
            mediaUrl: "/guide-media/kith-1423/assets/garage-to-elevator.mp4",
            mediaType: "video",
            playbackRate: 0.25,
          },
        ],
      }),
    );
    expect(walkthroughHtml).toContain("guest-video-scrim");
    expect(walkthroughHtml).toContain("0.25×");

    const nearbyHtml = renderToStaticMarkup(
      React.createElement(NearbyServices, {
        services: [
          { name: "Metro", category: "grocery", phone: "[BAD]" },
          { name: "Cafe", category: "restaurant", phone: "416-555-0100" },
        ],
      }),
    );
    expect(nearbyHtml).toContain("guest-control-surface");
    expect(nearbyHtml).not.toContain("tel:[BAD]");
  });

  it("enforces Hallmark Gate 48 token purity, inset video poster focus, and zero inline background overrides on hoverable controls", () => {
    const guestDir = resolve(__dirname, "../../src/components/guest");
    const guestFiles = [
      "guide-layout.tsx",
      "guide-jump-nav.tsx",
      "guide-unlock-form.tsx",
      "hero-section.tsx",
      "checkin-walkthrough.tsx",
      "wifi-card.tsx",
      "parking-card.tsx",
      "house-rules-section.tsx",
      "amenities-section.tsx",
      "nearby-services.tsx",
      "checkout-section.tsx",
      "emergency-contacts.tsx",
      "sticky-bottom-bar.tsx",
      "copy-button.tsx",
      "theme-toggle.tsx",
    ];

    for (const f of guestFiles) {
      const src = readFileSync(resolve(guestDir, f), "utf-8");
      expect(src, `${f} must not contain inline hex literal`).not.toMatch(
        /#[0-9a-fA-F]{3,8}\b/,
      );
      expect(src, `${f} must not contain raw bg-black utility`).not.toMatch(
        /\bbg-black(?:\/|\b)/,
      );
    }

    const css = readFileSync(
      resolve(__dirname, "../../src/app/globals.css"),
      "utf-8",
    );
    expect(css).toContain(".guest-video-scrim:focus-visible");
    expect(css).toContain("outline-offset: -4px");
    expect(css).toContain(".guest-control-surface:hover:not(:disabled)");
  });
});
