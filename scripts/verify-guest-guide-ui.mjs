import { createRequire } from "node:module";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const PLAYWRIGHT_PKG =
  process.env.PLAYWRIGHT_PACKAGE_JSON ||
  path.resolve(REPO_ROOT, "../gstack/package.json");
const fallbackPlaywrightPkg = "/Users/mkgbuilds/Code/MKG-Builds-Projects/gstack/package.json";
const resolvedPlaywrightPkg = fs.existsSync(PLAYWRIGHT_PKG)
  ? PLAYWRIGHT_PKG
  : fallbackPlaywrightPkg;

const require = createRequire(resolvedPlaywrightPkg);
const { chromium } = require("playwright");

const ENV_PATH =
  process.env.HOSTKIT_ENV_FILE ||
  (fs.existsSync(path.join(REPO_ROOT, ".env"))
    ? path.join(REPO_ROOT, ".env")
    : "/Users/mkgbuilds/Code/MKG-Builds-Projects/HostKit/.env");

const OUT_DIR =
  process.env.SCREENSHOT_OUT_DIR ||
  path.join(REPO_ROOT, ".next/cache/guest-guide-ui-audit");
const PORT = Number(process.env.AUDIT_PORT || 3423);
const BASE = `http://127.0.0.1:${PORT}`;

fs.mkdirSync(OUT_DIR, { recursive: true });

function loadEnvFile(filePath) {
  const env = { ...process.env };
  if (fs.existsSync(filePath)) {
    const text = fs.readFileSync(filePath, "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        env[m[1]] = m[2].replace(/^"|"$/g, "");
      }
    }
  }
  env.PORT = String(PORT);
  env.HOSTNAME = "127.0.0.1";
  return env;
}

function parseReadOnlyLoopbackPostgresConfig(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw new Error("DATABASE_URL is required for local Guest Guide UI verification.");
  }
  const trimmed = rawUrl.trim();
  const schemeMatch = /^(postgres(?:ql)?):\/\/(.*)$/i.exec(trimmed);
  if (!schemeMatch) {
    throw new Error("DATABASE_URL must start with postgres:// or postgresql://.");
  }

  const remainder = schemeMatch[2];
  const slashIdx = remainder.search(/[/?#]/);
  const authority = slashIdx === -1 ? remainder : remainder.slice(0, slashIdx);
  if (!authority || authority.includes(",")) {
    throw new Error("Refusing multi-host or malformed DATABASE_URL authority.");
  }
  const atCount = (authority.match(/@/g) || []).length;
  if (atCount > 1) {
    throw new Error("Refusing DATABASE_URL with ambiguous '@' delimiters in authority.");
  }

  const parsed = new URL(trimmed);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(`Unsupported DATABASE_URL protocol: ${parsed.protocol}`);
  }
  if (parsed.search || parsed.hash) {
    throw new Error(
      "Refusing DATABASE_URL with query parameters or fragments that could override read-only session settings.",
    );
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") {
    throw new Error(
      `Refusing to run UI verifier against non-loopback DATABASE_URL host "${parsed.hostname}". Use a local disposable database on localhost/127.0.0.1.`,
    );
  }

  const port = parsed.port ? Number(parsed.port) : 5432;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid DATABASE_URL port: "${parsed.port}".`);
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!database || database.includes("/") || database.includes("\0")) {
    throw new Error("DATABASE_URL must specify a valid single database name.");
  }

  const username = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  const authPart = username
    ? `${encodeURIComponent(username)}${password ? `:${encodeURIComponent(password)}` : ""}@`
    : "";
  const formattedHost = host === "::1" ? "[::1]" : host;
  const cleanUrl = `postgresql://${authPart}${formattedHost}:${port}/${encodeURIComponent(database)}`;

  return { host, port, database, username, password, cleanUrl };
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server did not become healthy at ${url} within ${timeoutMs}ms`);
}

async function readLocalAccessCodeReadOnly(env) {
  const dbCfg = parseReadOnlyLoopbackPostgresConfig(env.DATABASE_URL);
  env.DATABASE_URL = dbCfg.cleanUrl;
  const localReq = createRequire(path.join(REPO_ROOT, "package.json"));
  const postgres = localReq("postgres");
  const sql = postgres({
    host: dbCfg.host,
    port: dbCfg.port,
    database: dbCfg.database,
    username: dbCfg.username,
    password: dbCfg.password,
    ssl: false,
    max: 1,
    connection: { default_transaction_read_only: true },
  });
  try {
    assert.deepEqual(sql.options.host, [dbCfg.host], "Postgres client host must match validated loopback host");
    assert.equal(
      sql.options.connection?.default_transaction_read_only,
      true,
      "Postgres client must enforce default_transaction_read_only=true",
    );
    const rows = await sql`
      SELECT guest_access_code
      FROM properties
      WHERE slug = ${"kith-1423"}
    `;
    return rows[0]?.guest_access_code;
  } finally {
    await sql.end();
  }
}

async function auditDomOnPage(page, viewportLabel) {
  return page.evaluate((vp) => {
    const docEl = document.documentElement;
    const overflowPx = docEl.scrollWidth - window.innerWidth;

    const interactive = Array.from(
      document.querySelectorAll('a[href], button:not([disabled]), input:not([type="hidden"])'),
    );

    const smallTargets = [];
    const wrappedClickables = [];
    const brokenTelLinks = [];
    const contactOverlaps = [];
    const labelInNameMismatches = [];

    for (const el of interactive) {
      const style = window.getComputedStyle(el);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) === 0
      ) {
        continue;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 70);
      const aria = el.getAttribute("aria-label") || "";
      const href = el.getAttribute("href") || "";

      // WCAG 2.5.3 Label in Name: when an interactive element has both visible text and aria-label,
      // every visible text segment must appear inside aria-label.
      if (aria && text && tag !== "input") {
        const lowerAria = aria.toLowerCase();
        const inEmergency = Boolean(el.closest("#emergency"));
        if (inEmergency) {
          for (const child of Array.from(el.children)) {
            const seg = (child.textContent || "").trim().replace(/\s+/g, " ").toLowerCase();
            if (seg && !lowerAria.includes(seg)) {
              labelInNameMismatches.push({ vp, text, aria, missingSegment: seg });
            }
          }
        } else if (!lowerAria.includes(text.toLowerCase())) {
          labelInNameMismatches.push({ vp, text, aria });
        }
      }

      if (href.startsWith("tel:")) {
        if (href.includes("[") || href.includes("]") || !/^tel:\+?\d{3,15}$/.test(href)) {
          brokenTelLinks.push({ vp, href, text });
        }
      }

      if (rect.height < 43.5) {
        smallTargets.push({
          vp,
          tag,
          text: text || aria,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        });
      }

      const inEmergencyCard = Boolean(el.closest("#emergency")) && href.startsWith("tel:");
      if (inEmergencyCard) {
        const spans = Array.from(el.children);
        if (spans.length >= 2) {
          const leftBox = spans[0].getBoundingClientRect();
          const rightBox = spans[1].getBoundingClientRect();
          const verticalOverlap =
            Math.min(leftBox.bottom, rightBox.bottom) - Math.max(leftBox.top, rightBox.top);
          const horizontalOverlap =
            Math.min(leftBox.right, rightBox.right) - Math.max(leftBox.left, rightBox.left);
          if (verticalOverlap > 2 && horizontalOverlap > -4) {
            contactOverlaps.push({
              vp,
              text,
              leftRight: Math.round(leftBox.right),
              rightLeft: Math.round(rightBox.left),
            });
          }
        }
      }

      const isVideoPosterOverlay = el.classList.contains("guest-video-scrim");
      if (!inEmergencyCard && !isVideoPosterOverlay) {
        if (el.hasAttribute("aria-expanded")) {
          const titleSpan = el.querySelector("span.font-semibold") || el;
          const titleRect = titleSpan.getBoundingClientRect();
          if (titleRect.height > 28) {
            wrappedClickables.push({
              vp,
              tag: "accordion-title",
              text,
              height: Math.round(titleRect.height),
            });
          }
        } else if (rect.height > 54) {
          wrappedClickables.push({
            vp,
            tag,
            text: text || aria,
            height: Math.round(rect.height),
          });
        }
      }
    }

    return {
      vp,
      innerWidth: window.innerWidth,
      scrollWidth: docEl.scrollWidth,
      overflowPx,
      smallTargets,
      wrappedClickables,
      brokenTelLinks,
      contactOverlaps,
      labelInNameMismatches,
    };
  }, viewportLabel);
}

async function main() {
  const env = loadEnvFile(ENV_PATH);
  const accessCode = await readLocalAccessCodeReadOnly(env);
  assert.ok(
    accessCode,
    "Expected guest_access_code on local loopback kith-1423 row (seed local disposable DB first)",
  );

  const nextBin = path.join(REPO_ROOT, "node_modules", ".bin", "next");
  const server = spawn(nextBin, ["start", "-p", String(PORT), "-H", "127.0.0.1"], {
    cwd: REPO_ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const browser = await chromium.launch({ headless: true });
  const report = {
    mediaAuthGate: {},
    lockScreen: {},
    unlockedFlow: {},
    behavioralChecks: {},
    aboveTheFold320: {},
    desktopOverlayAndNavCheck: {},
    viewports: [],
    videoScrubAndSpeedCheck: {},
  };

  try {
    await waitForServer(BASE);

    // 0. Unauthenticated media gate check (must return 401 without cookie)
    {
      const unauthRes = await fetch(
        `${BASE}/guide-media/kith-1423/assets/garage-to-elevator.mp4`,
        { redirect: "manual" },
      );
      assert.equal(
        unauthRes.status,
        401,
        `Unauthenticated /guide-media request must return 401, got ${unauthRes.status}`,
      );
      report.mediaAuthGate.unauthenticatedStatus = unauthRes.status;
    }

    // 1. Lock Screen + Unlock + Behavioral Interactive Resilience Suite
    {
      const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
      const page = await ctx.newPage();
      const pageErrors = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      await page.goto(`${BASE}/g/kith-1423`, { waitUntil: "networkidle" });
      assert.equal(
        await page.locator('nav[aria-label="Guide sections"]').count(),
        0,
        "Lock screen must NOT render Guide sections nav",
      );
      await page.screenshot({ path: path.join(OUT_DIR, "lock-375-light.png"), fullPage: true });
      report.lockScreen.mobileLight = await auditDomOnPage(page, "lock-375-light");

      await page.locator('input[name="code"]').fill("WRONG-0000");
      await page.locator('button[type="submit"]').click();
      await page.locator("#unlock-error").waitFor({ state: "visible", timeout: 8000 });
      await page.screenshot({ path: path.join(OUT_DIR, "lock-375-error.png"), fullPage: true });

      await page.locator('input[name="code"]').fill(accessCode);
      await page.locator('button[type="submit"]').click();
      await page.locator("#arrival").waitFor({ state: "visible", timeout: 10000 });

      // Authenticated byte-range probe (206 Partial Content)
      const rangeStatus = await page.evaluate(async () => {
        const r = await fetch("/guide-media/kith-1423/assets/garage-to-elevator.mp4", {
          headers: { Range: "bytes=0-1023" },
        });
        return r.status;
      });
      assert.equal(rangeStatus, 206, `Authenticated Range request must return 206, got ${rangeStatus}`);
      report.mediaAuthGate.authenticatedRangeStatus = rangeStatus;

      const navLinksAfterUnlock = await page
        .locator('nav[aria-label="Guide sections"] a')
        .allTextContents();
      report.unlockedFlow.navLinksImmediatelyAfterUnlock = navLinksAfterUnlock;

      // 1a. Mounted localStorage corruption repair verification
      const storageKey = "hostkit_completed_steps_kith-1423_v2";
      await page.evaluate(
        ([k, v]) => localStorage.setItem(k, v),
        [storageKey, "null"],
      );
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(
        await page.evaluate((k) => localStorage.getItem(k), storageKey),
        null,
        "Corrupt 'null' storage entry must be removed on mount",
      );

      await page.evaluate(
        ([k, v]) => localStorage.setItem(k, v),
        [storageKey, '[1, 3, 3, 999, "bad"]'],
      );
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(
        await page.evaluate((k) => localStorage.getItem(k), storageKey),
        "[1,3]",
        "Mixed valid/invalid storage entry must be repaired to '[1,3]' on mount",
      );
      await page.evaluate((k) => localStorage.removeItem(k), storageKey);
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(pageErrors.length, 0, `Page errors: ${pageErrors.join("; ")}`);
      report.behavioralChecks.storageRepairVerified = true;

      // 1b. Hover background delta verification on .guest-control-surface buttons
      const step2Btn = page.locator("#arrival button[aria-expanded]").nth(1);
      await step2Btn.click();
      await page.locator("#arrival video").first().waitFor({ state: "visible", timeout: 5000 });

      const speedHalfBtn = page
        .locator('#arrival [aria-label="Playback speed"] button')
        .filter({ hasText: "0.5×" })
        .first();
      const speedRestBg = await speedHalfBtn.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );
      await speedHalfBtn.hover();
      await page.waitForTimeout(180);
      const speedHoverBg = await speedHalfBtn.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );
      assert.notEqual(
        speedHoverBg,
        speedRestBg,
        `Inactive speed button must change background on :hover (was ${speedRestBg})`,
      );

      const inactiveCatBtn = page
        .locator('#nearby [role="group"] button[aria-pressed="false"]')
        .first();
      await inactiveCatBtn.scrollIntoViewIfNeeded();
      const catRestBg = await inactiveCatBtn.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );
      await inactiveCatBtn.hover();
      await page.waitForTimeout(180);
      const catHoverBg = await inactiveCatBtn.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );
      assert.notEqual(
        catHoverBg,
        catRestBg,
        `Inactive category pill must change background on :hover (was ${catRestBg})`,
      );

      // Verify hover deltas across remaining claimed .guest-control-surface action controls
      const extraHoverControls = [
        { name: "Open Maps", loc: page.getByRole("link", { name: /Open Maps/i }).first() },
        { name: "Copy Wi-Fi", loc: page.getByRole("button", { name: "Copy Wi-Fi password" }).first() },
        { name: "Open garage in Maps", loc: page.getByRole("link", { name: /Open garage in Maps/i }).first() },
        { name: "Emergency contact row", loc: page.locator("#emergency a").first() },
      ];
      for (const ctrl of extraHoverControls) {
        await ctrl.loc.scrollIntoViewIfNeeded();
        const restBg = await ctrl.loc.evaluate((el) => getComputedStyle(el).backgroundColor);
        await ctrl.loc.hover();
        await page.waitForTimeout(160);
        const hoverBg = await ctrl.loc.evaluate((el) => getComputedStyle(el).backgroundColor);
        assert.notEqual(
          hoverBg,
          restBg,
          `${ctrl.name} must change background on :hover (was ${restBg})`,
        );
      }
      report.behavioralChecks.hoverFeedback = {
        speedRestBg,
        speedHoverBg,
        catRestBg,
        catHoverBg,
        allActionControlsVerified: true,
      };

      // 1c. Keyboard :focus-visible on video poster Play button (must be inset, not clipped)
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
      });
      await page.waitForTimeout(200);
      const posterPlayBtn = page.locator("#arrival button.guest-video-scrim").first();
      await posterPlayBtn.scrollIntoViewIfNeeded();
      await posterPlayBtn.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      const posterFocusStyles = await posterPlayBtn.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          isFocused: document.activeElement === el,
          matchesFocusVisible: el.matches(":focus-visible"),
          outlineOffset: cs.outlineOffset,
          outlineStyle: cs.outlineStyle,
          boxShadow: cs.boxShadow,
        };
      });
      assert.equal(posterFocusStyles.isFocused, true, "Poster Play button must receive Tab focus");
      assert.equal(
        posterFocusStyles.matchesFocusVisible,
        true,
        "Poster Play button must match :focus-visible on keyboard Tab",
      );
      assert.equal(
        posterFocusStyles.outlineOffset,
        "-4px",
        `Poster Play button must use inset -4px outlineOffset, got ${posterFocusStyles.outlineOffset}`,
      );
      assert.ok(
        posterFocusStyles.boxShadow.includes("inset"),
        `Poster Play button must include inset box-shadow ring, got ${posterFocusStyles.boxShadow}`,
      );
      await page.screenshot({
        path: path.join(OUT_DIR, "focus-poster-375-dark.png"),
        fullPage: false,
      });
      report.behavioralChecks.posterFocusVisible = posterFocusStyles;

      // Also verify collapsed Amenities accordion keyboard :focus-visible (inset -3px, unclipped even as sole row)
      const kitchenTrigger = page.locator('#included button[aria-expanded]').first();
      await kitchenTrigger.scrollIntoViewIfNeeded();
      await kitchenTrigger.click(); // collapse Kitchen so all categories are collapsed
      await kitchenTrigger.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      const amenitiesFocusStyles = await kitchenTrigger.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          isFocused: document.activeElement === el,
          ariaExpanded: el.getAttribute("aria-expanded"),
          matchesFocusVisible: el.matches(":focus-visible"),
          outlineOffset: cs.outlineOffset,
          outlineStyle: cs.outlineStyle,
        };
      });
      assert.equal(amenitiesFocusStyles.isFocused, true, "Collapsed Amenities trigger must receive Tab focus");
      assert.equal(amenitiesFocusStyles.ariaExpanded, "false", "Kitchen trigger must be collapsed");
      assert.equal(amenitiesFocusStyles.matchesFocusVisible, true, "Amenities trigger must match :focus-visible");
      assert.equal(
        amenitiesFocusStyles.outlineOffset,
        "-3px",
        `Accordion trigger must use inset -3px outlineOffset inside overflow-hidden card, got ${amenitiesFocusStyles.outlineOffset}`,
      );
      await page.screenshot({
        path: path.join(OUT_DIR, "focus-amenities-collapsed-375-dark.png"),
        fullPage: false,
      });
      report.behavioralChecks.collapsedAmenitiesFocusVisible = amenitiesFocusStyles;

      // 1d. Delayed video retry lifecycle via real HTTP 500 -> 550ms delayed 200/206
      let arrivalVideoMode = "fail";
      await page.route("**/guide-media/kith-1423/assets/arrival-drive.mp4", async (route) => {
        if (arrivalVideoMode === "fail") {
          await route.fulfill({
            status: 500,
            contentType: "text/plain",
            body: "Transient media error",
          });
          return;
        }
        if (arrivalVideoMode === "delayed") {
          await new Promise((r) => setTimeout(r, 550));
        }
        await route.continue();
      });

      await page.locator("#arrival video").first().evaluate((v) => {
        v.load();
      });
      const retryBtn = page.getByRole("button", { name: "Retry video" });
      await retryBtn.waitFor({ state: "visible", timeout: 5000 });
      const retryBox = await retryBtn.boundingBox();
      assert.ok(retryBox && retryBox.height >= 43.5, "Retry video button must be >=44px tall");

      // Switch route to 750ms delayed success, click Retry video, verify Loading… persists across loadstart,
      // AND verify explicit Pause during stalled buffering immediately clears Loading…!
      arrivalVideoMode = "delayed";
      await retryBtn.click();

      // 150ms into the delayed network response (after loadstart), Loading… must remain visible!
      await page.waitForTimeout(150);
      const loadingLocator = page.locator('#arrival [role="status"]').filter({ hasText: "Loading" });
      assert.equal(
        await loadingLocator.isVisible(),
        true,
        "Loading… badge must remain visible across loadstart while waiting for delayed retry frames",
      );

      // Explicitly pause while stalled in Loading… state -> Loading… must disappear immediately and NOT return!
      const pauseTransportBtn = page.locator('#arrival button[aria-label="Pause video"]').first();
      await pauseTransportBtn.click();
      await page.waitForTimeout(60);
      assert.equal(
        await loadingLocator.count(),
        0,
        "Explicit Pause during buffering must immediately clear Loading… badge",
      );
      await page.waitForTimeout(650);
      assert.equal(
        await loadingLocator.count(),
        0,
        "Loading… badge must remain cleared after aborted play() promise settles",
      );

      arrivalVideoMode = "normal";
      await page.unroute("**/guide-media/kith-1423/assets/arrival-drive.mp4");
      report.behavioralChecks.delayedVideoRetryAndPauseClearVerified = true;

      // 1e. Persistent manual copy fallback (>6.5s persistence + auto-focused readonly input + WCAG 2.5.3 Retry copy aria-label)
      await page.evaluate(() => {
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: () => Promise.reject(new Error("Clipboard blocked")),
          },
        });
        document.execCommand = () => false;
      });
      const copyWifiBtn = page.getByRole("button", { name: "Copy Wi-Fi password" }).first();
      await copyWifiBtn.scrollIntoViewIfNeeded();
      await copyWifiBtn.click();

      const manualInput = page.locator('input[aria-label*="Manual copy value"]').first();
      await manualInput.waitFor({ state: "visible", timeout: 3000 });
      const retryCopyBtn = page.getByRole("button", { name: /^Retry copy/i }).first();
      assert.equal(
        await retryCopyBtn.isVisible(),
        true,
        "Failed CopyButton must expose WCAG 2.5.3 'Retry copy' accessible name",
      );
      const manualFocusState = await manualInput.evaluate((el) => ({
        isFocused: document.activeElement === el,
        selectionLength: (el.selectionEnd ?? 0) - (el.selectionStart ?? 0),
        valueLength: el.value.length,
      }));
      assert.equal(manualFocusState.isFocused, true, "Manual copy input must auto-focus");
      assert.equal(
        manualFocusState.selectionLength,
        manualFocusState.valueLength,
        "Manual copy input must select full value on focus",
      );

      // Wait 6.4 seconds (past the old 6s auto-hide window) and confirm it does NOT disappear!
      await page.waitForTimeout(6400);
      assert.equal(
        await manualInput.isVisible(),
        true,
        "Manual copy recovery must stay mounted past 6s until copied or explicitly dismissed",
      );

      const dismissBtn = page.getByRole("button", { name: "Dismiss manual copy" }).first();
      await dismissBtn.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(80);
      assert.equal(
        await manualInput.count(),
        0,
        "Activating Dismiss manual copy must unmount the manual fallback",
      );
      const restoredFocusToCopyBtn = await copyWifiBtn.evaluate(
        (el) => document.activeElement === el,
      );
      assert.equal(
        restoredFocusToCopyBtn,
        true,
        "Keyboard activation of Dismiss manual copy must restore focus to the originating CopyButton",
      );
      report.behavioralChecks.persistentManualCopyVerified = true;

      await ctx.close();
    }

    // 1f. Mounted blocked-localStorage (throwing SecurityError getter) browser check
    {
      const blockedCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
      await blockedCtx.addInitScript(() => {
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          get() {
            throw new DOMException("The operation is insecure.", "SecurityError");
          },
        });
      });
      const blockedPage = await blockedCtx.newPage();
      const blockedErrors = [];
      blockedPage.on("pageerror", (err) => blockedErrors.push(err.message));

      await blockedPage.goto(`${BASE}/g/kith-1423`, { waitUntil: "networkidle" });
      await blockedPage.locator('input[name="code"]').fill(accessCode);
      await blockedPage.locator('button[type="submit"]').click();
      await blockedPage.locator("#arrival").waitFor({ state: "visible", timeout: 10000 });

      const markDoneBtn = blockedPage.getByRole("button", { name: "Mark as Done" }).first();
      await markDoneBtn.click();
      await blockedPage.getByText("1 of 6 steps completed").waitFor({ state: "visible", timeout: 3000 });
      assert.equal(
        blockedErrors.length,
        0,
        `Blocked localStorage getter must not crash walkthrough: ${blockedErrors.join("; ")}`,
      );
      report.behavioralChecks.blockedLocalStorageGetterVerified = true;
      await blockedCtx.close();
    }

    // 2. Audit all 6 Hallmark viewports in BOTH Light & Dark
    const viewports = [
      { name: "320x568", width: 320, height: 568, modes: ["light", "dark"] },
      { name: "375x812", width: 375, height: 812, modes: ["light", "dark"] },
      { name: "414x896", width: 414, height: 896, modes: ["light", "dark"] },
      { name: "768x1024", width: 768, height: 1024, modes: ["light", "dark"] },
      { name: "1280x800", width: 1280, height: 800, modes: ["light", "dark"] },
      { name: "1440x900", width: 1440, height: 900, modes: ["light", "dark"] },
    ];

    for (const vp of viewports) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/g/kith-1423`, { waitUntil: "networkidle" });
      await page.locator('input[name="code"]').fill(accessCode);
      await page.locator('button[type="submit"]').click();
      await page.locator("#arrival").waitFor({ state: "visible", timeout: 10000 });

      // Open Step 6 (0.25x video player)
      const step6Btn = page.locator("#arrival button[aria-expanded]").nth(5);
      await step6Btn.click();
      await page.waitForTimeout(300);

      if (vp.name === "320x568") {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        const foldCheck = await page.evaluate(() => {
          const aside = document.querySelector('aside[aria-label="Stay essentials"]');
          const sticky = Array.from(document.querySelectorAll("div.fixed.bottom-0")).find(
            (el) => window.getComputedStyle(el).display !== "none",
          );
          const stickyTop = sticky ? sticky.getBoundingClientRect().top : window.innerHeight;
          const dds = aside ? Array.from(aside.querySelectorAll("dd")) : [];
          const buzzerDd = dds.find((d) => (d.textContent || "").includes("GUIRGUIS"));
          const parkingDd = dds.find((d) => (d.textContent || "").includes("P3-257"));
          return {
            viewportHeight: window.innerHeight,
            stickyTop: Math.round(stickyTop),
            buzzerBottom: buzzerDd ? Math.round(buzzerDd.getBoundingClientRect().bottom) : null,
            parkingBottom: parkingDd ? Math.round(parkingDd.getBoundingClientRect().bottom) : null,
          };
        });
        report.aboveTheFold320 = foldCheck;
        assert.ok(
          foldCheck.buzzerBottom !== null && foldCheck.buzzerBottom <= foldCheck.stickyTop,
          `Expected Intercom GUIRGUIS, M visible above sticky bar on 320x568, got ${JSON.stringify(foldCheck)}`,
        );
      }

      if (vp.name === "1440x900") {
        // Verify desktop overlay hidden + desktop GuideJumpNav click persistence on Wi-Fi & Parking
        const desktopCheck = await page.evaluate(() => {
          const stickyVisible = Array.from(document.querySelectorAll("div.fixed.bottom-0")).some(
            (el) => window.getComputedStyle(el).display !== "none",
          );
          const heroCallHost = Array.from(document.querySelectorAll("header a")).some(
            (a) =>
              (a.textContent || "").includes("Call Host") &&
              window.getComputedStyle(a).display !== "none",
          );
          return { stickyVisible, heroCallHost };
        });
        assert.equal(desktopCheck.stickyVisible, false, "Mobile StickyBottomBar must be hidden on desktop");
        assert.equal(desktopCheck.heroCallHost, true, "Desktop Hero must display Call Host action");

        const wifiNavLink = page.locator('nav[aria-label="Guide sections"] a[href="#wifi"]');
        await wifiNavLink.click();
        await page.waitForTimeout(750);
        assert.equal(
          await wifiNavLink.getAttribute("aria-current"),
          "location",
          "Desktop Wi-Fi nav pill must remain active after smooth scroll settles",
        );

        const parkingNavLink = page.locator('nav[aria-label="Guide sections"] a[href="#parking"]');
        await parkingNavLink.click();
        await page.waitForTimeout(750);
        assert.equal(
          await parkingNavLink.getAttribute("aria-current"),
          "location",
          "Desktop Parking nav pill must remain active alongside tall Arrival column",
        );

        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.waitForTimeout(180);
        const arrivalNavLink = page.locator('nav[aria-label="Guide sections"] a[href="#arrival"]');
        assert.equal(
          await arrivalNavLink.getAttribute("aria-current"),
          "location",
          "Desktop Arrival nav pill must reactivate when scrolled back to top: 0",
        );
        report.desktopOverlayAndNavCheck = {
          ...desktopCheck,
          wifiClickPersisted: true,
          parkingClickPersisted: true,
          topResetToArrival: true,
        };
      }

      for (const mode of vp.modes) {
        await page.evaluate((m) => {
          document.documentElement.classList.toggle("dark", m === "dark");
          localStorage.setItem("hostkit-theme", m);
          window.scrollTo({ top: 0, behavior: "instant" });
        }, mode);
        await page.waitForTimeout(180);

        const domAudit = await auditDomOnPage(page, `${vp.name}-${mode}`);
        report.viewports.push(domAudit);

        await page.screenshot({
          path: path.join(OUT_DIR, `fold-${vp.name}-${mode}.png`),
          fullPage: false,
        });

        if (["320x568", "375x812", "414x896", "1440x900"].includes(vp.name)) {
          await page.screenshot({
            path: path.join(OUT_DIR, `full-${vp.name}-${mode}.png`),
            fullPage: true,
          });
        }
      }

      // On 1440x900, verify Step 6 0.25x playback rate AND real pointer timeline scrubbing
      if (vp.name === "1440x900") {
        const video = page.locator("#arrival video").first();
        await video.scrollIntoViewIfNeeded();
        await video.waitFor({ state: "visible", timeout: 5000 });
        const playBtn = page.locator("#arrival button.guest-video-scrim").first();
        await playBtn.click();
        await page.waitForTimeout(900);

        // Scrub timeline range slider via pointer + React value setter to ~45% of clip
        const slider = page.locator('#arrival input[type="range"]').first();
        const sliderBox = await slider.boundingBox();
        assert.ok(sliderBox, "Expected visible range scrubber on Step 6");
        await page.mouse.move(
          sliderBox.x + sliderBox.width * 0.45,
          sliderBox.y + sliderBox.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(
          sliderBox.x + sliderBox.width * 0.5,
          sliderBox.y + sliderBox.height / 2,
        );
        await page.mouse.up();
        await page.waitForTimeout(350);

        const rateAndScrubCheck = await video.evaluate((v) => ({
          playbackRate: v.playbackRate,
          defaultPlaybackRate: v.defaultPlaybackRate,
          currentTime: Math.round(v.currentTime * 100) / 100,
          duration: Math.round(v.duration * 100) / 100,
          paused: v.paused,
        }));
        report.videoScrubAndSpeedCheck = rateAndScrubCheck;
        assert.equal(rateAndScrubCheck.playbackRate, 0.25, "Step 6 playbackRate must remain 0.25x");
        assert.ok(
          rateAndScrubCheck.currentTime >= 3.5,
          `Expected pointer scrub to seek near mid-clip (>=3.5s), got ${rateAndScrubCheck.currentTime}s`,
        );

        await page.screenshot({
          path: path.join(OUT_DIR, "step6-desktop-1440-dark.png"),
          fullPage: false,
        });
      }

      await ctx.close();
    }
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }

  fs.writeFileSync(path.join(OUT_DIR, "audit-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  for (const v of report.viewports) {
    assert.ok(v.overflowPx <= 0, `Horizontal overflow at ${v.vp}: +${v.overflowPx}px`);
    assert.equal(
      v.smallTargets.length,
      0,
      `Sub-44px touch targets at ${v.vp}: ${JSON.stringify(v.smallTargets)}`,
    );
    assert.equal(
      v.wrappedClickables.length,
      0,
      `Multi-line clickable triggers at ${v.vp}: ${JSON.stringify(v.wrappedClickables)}`,
    );
    assert.equal(
      v.brokenTelLinks.length,
      0,
      `Broken tel: links at ${v.vp}: ${JSON.stringify(v.brokenTelLinks)}`,
    );
    assert.equal(
      v.contactOverlaps.length,
      0,
      `Overlapping contact labels/numbers at ${v.vp}: ${JSON.stringify(v.contactOverlaps)}`,
    );
    assert.equal(
      v.labelInNameMismatches.length,
      0,
      `WCAG 2.5.3 Label-in-Name mismatches at ${v.vp}: ${JSON.stringify(v.labelInNameMismatches)}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
