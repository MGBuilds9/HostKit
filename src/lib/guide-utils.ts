/**
 * Pure, deterministic helpers and state controllers for Guest Guide resilience,
 * formatting, Wi-Fi QR escaping, dialable contact validation, section availability,
 * video loading/retry transitions, clipboard fallback, and two-column jump-nav tracking.
 */

export interface DialablePhone {
  display: string;
  href: string;
}

/**
 * Validates and normalizes a phone or emergency number for `tel:` links.
 * Rejects empty values, bracketed placeholders like `[MARIAM_PHONE]`,
 * and strings with fewer than 3 digits (allows 3-digit emergency codes like 911).
 */
export function normalizeDialablePhone(
  raw: string | null | undefined,
): DialablePhone | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes("[") || trimmed.includes("]")) return null;
  if (/[a-zA-Z]/.test(trimmed)) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 3 || digits.length > 15) return null;

  const hasLeadingPlus = trimmed.startsWith("+");
  const normalizedDial = hasLeadingPlus ? `+${digits}` : digits;

  return {
    display: trimmed,
    href: `tel:${normalizedDial}`,
  };
}

/**
 * Formats 24-hour `"HH:MM"` or `"HH:MM:SS"` strings into 12-hour display strings
 * (e.g., `"15:00"` -> `"3:00 PM"`) without Date parsing quirks or `"Invalid Date"`.
 */
export function formatGuideTime(time?: string | null): string | null {
  if (typeof time !== "string") return null;
  const trimmed = time.trim();
  const match = /^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(trimmed);
  if (!match) return null;

  const hours24 = Number(match[1]);
  const minutes = match[2]!;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${period}`;
}

/**
 * Escapes reserved characters (`\`, `;`, `,`, `"`, `:`) per the ZXing / iOS / Android
 * `WIFI:` QR code specification so special characters in SSIDs or passwords scan accurately.
 */
export function escapeWifiQrField(value: string): string {
  return value.replace(/([\\;,"':])/g, "\\$1");
}

export function buildWifiQrPayload(ssid: string, password: string): string {
  return `WIFI:S:${escapeWifiQrField(ssid)};T:WPA;P:${escapeWifiQrField(password)};;`;
}

/**
 * Safely parses `localStorage` step completion JSON, returning a deduplicated
 * array of valid numeric step IDs and flagging when storage was corrupt.
 */
export function parseSavedCompletedSteps(
  raw: string | null,
  validStepIds: ReadonlySet<number>,
): { steps: number[]; valid: boolean } {
  if (raw === null) return { steps: [], valid: true };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { steps: [], valid: false };
    }
    const seen = new Set<number>();
    let allValid = true;
    for (const item of parsed) {
      if (typeof item === "number" && Number.isInteger(item) && validStepIds.has(item)) {
        seen.add(item);
      } else {
        allValid = false;
      }
    }
    if (seen.size !== parsed.length) {
      allValid = false;
    }
    return { steps: Array.from(seen), valid: allValid };
  } catch {
    return { steps: [], valid: false };
  }
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Safely acquires `localStorage` from `window` (or a custom target), catching
 * `SecurityError` exceptions thrown by the `window.localStorage` property getter
 * when cookies/site data are blocked.
 */
export function getSafeLocalStorage(
  target: { readonly localStorage?: StorageLike | null } | null | undefined =
    typeof window !== "undefined" ? window : null,
): StorageLike | null {
  if (!target) return null;
  try {
    return target.localStorage ?? null;
  } catch {
    return null;
  }
}

export interface LoopbackPostgresConfig {
  host: "127.0.0.1" | "localhost" | "::1";
  port: number;
  database: string;
  username: string;
  password: string;
  cleanUrl: string;
}

/**
 * Strictly parses a PostgreSQL URL into discrete single-host loopback connection
 * parameters (`127.0.0.1`, `localhost`, or `::1`), rejecting multi-host authority
 * strings, duplicate `@` delimiters, and query/hash parameter overrides (such as
 * `?default_transaction_read_only=off` or `?host=...`).
 */
export function parseReadOnlyLoopbackPostgresConfig(
  rawUrl: string | null | undefined,
): LoopbackPostgresConfig {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw new Error("DATABASE_URL is required for local verification.");
  }
  const trimmed = rawUrl.trim();
  const schemeMatch = /^(postgres(?:ql)?):\/\/(.*)$/i.exec(trimmed);
  if (!schemeMatch) {
    throw new Error("DATABASE_URL must start with postgres:// or postgresql://.");
  }

  const remainder = schemeMatch[2]!;
  const slashIdx = remainder.search(/[/?#]/);
  const authority = slashIdx === -1 ? remainder : remainder.slice(0, slashIdx);
  if (!authority || authority.includes(",")) {
    throw new Error("Refusing multi-host or malformed DATABASE_URL authority.");
  }
  const atCount = (authority.match(/@/g) ?? []).length;
  if (atCount > 1) {
    throw new Error("Refusing DATABASE_URL with ambiguous '@' delimiters in authority.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL.");
  }
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
      `Refusing non-loopback DATABASE_URL host "${parsed.hostname}". Only localhost/127.0.0.1/::1 is permitted.`,
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

  return {
    host,
    port,
    database,
    username,
    password,
    cleanUrl,
  };
}

export function assertLoopbackDatabaseUrl(rawUrl: string | null | undefined): LoopbackPostgresConfig {
  return parseReadOnlyLoopbackPostgresConfig(rawUrl);
}

/**
 * Computes a WCAG 2.5.3 (Label in Name) compliant `aria-label` for `CopyButton`
 * across all states (`idle`, `pending`, `copied`, `error`), guaranteeing the
 * accessible name begins with or contains the visible button text.
 */
export function resolveCopyButtonAriaLabel(params: {
  status: "idle" | "pending" | "copied" | "error";
  label: string;
  copiedLabel: string;
  ariaLabel?: string;
}): string {
  const { status, label, copiedLabel, ariaLabel } = params;
  const visibleText =
    status === "copied"
      ? copiedLabel
      : status === "pending"
        ? "Copying…"
        : status === "error"
          ? "Retry copy"
          : label;

  if (!ariaLabel) return visibleText;

  if (ariaLabel.toLowerCase().includes(visibleText.toLowerCase())) {
    return ariaLabel;
  }

  const contextDetail = ariaLabel.replace(/^Copy\s+/i, "").trim();
  return contextDetail ? `${visibleText} — ${contextDetail}` : `${visibleText} — ${ariaLabel}`;
}

/**
 * Reads, validates, and repairs persisted step completion state in `Storage`.
 */
export function hydrateAndRepairCompletedSteps(
  storage: StorageLike | null | undefined,
  storageKey: string,
  validStepIds: ReadonlySet<number>,
): number[] {
  if (!storage) return [];
  try {
    const saved = storage.getItem(storageKey);
    const parsed = parseSavedCompletedSteps(saved, validStepIds);
    if (!parsed.valid) {
      if (parsed.steps.length === 0) {
        storage.removeItem(storageKey);
      } else {
        storage.setItem(storageKey, JSON.stringify(parsed.steps));
      }
    }
    return parsed.steps;
  } catch {
    return [];
  }
}

export type VideoLoadState = "idle" | "loading" | "ready" | "error";

export interface VideoPlayerMachineState {
  status: VideoLoadState;
  pendingPlay: boolean;
  activeRequestId: number;
}

export type VideoPlayerMachineEvent =
  | { type: "mount"; readyState: number; hasMediaError: boolean }
  | { type: "play_requested"; readyState: number; requestId: number }
  | { type: "retry_requested"; requestId: number }
  | { type: "loadstart" }
  | { type: "metadata"; readyState: number }
  | { type: "canplay" }
  | { type: "playing" }
  | { type: "waiting"; isPlaying: boolean }
  | { type: "pause"; isElementPaused: boolean; readyState: number }
  | {
      type: "play_rejected";
      requestId: number;
      aborted: boolean;
      isElementPaused: boolean;
      readyState: number;
      hasMediaError: boolean;
      notSupported: boolean;
    }
  | { type: "error" };

/**
 * Deterministic media loading/retry state transitions for `StepVideoPlayer`.
 * Preserves `"loading"` across `loadstart` and metadata events while a play/retry
 * request is pending until `canplay`/`playing` (`readyState >= 3`), failure, or
 * explicit pause (`isElementPaused === true`). Guards against stale play promises via `activeRequestId`.
 */
export function transitionVideoLoadState(
  prev: VideoPlayerMachineState,
  event: VideoPlayerMachineEvent,
): VideoPlayerMachineState {
  switch (event.type) {
    case "mount": {
      if (event.hasMediaError) {
        return { status: "error", pendingPlay: false, activeRequestId: prev.activeRequestId };
      }
      if (event.readyState >= 1) {
        return { status: "ready", pendingPlay: false, activeRequestId: prev.activeRequestId };
      }
      return prev;
    }
    case "play_requested": {
      return {
        status: event.readyState < 3 ? "loading" : "ready",
        pendingPlay: true,
        activeRequestId: event.requestId,
      };
    }
    case "retry_requested": {
      return {
        status: "loading",
        pendingPlay: true,
        activeRequestId: event.requestId,
      };
    }
    case "loadstart": {
      if (prev.pendingPlay || prev.status === "loading") {
        return {
          status: "loading",
          pendingPlay: prev.pendingPlay,
          activeRequestId: prev.activeRequestId,
        };
      }
      if (prev.status === "error") {
        return prev;
      }
      return {
        status: prev.status === "ready" ? "ready" : "idle",
        pendingPlay: false,
        activeRequestId: prev.activeRequestId,
      };
    }
    case "metadata": {
      if (prev.status === "error") {
        return prev;
      }
      if (prev.pendingPlay && event.readyState < 3) {
        return {
          status: "loading",
          pendingPlay: true,
          activeRequestId: prev.activeRequestId,
        };
      }
      return {
        status: "ready",
        pendingPlay: prev.pendingPlay,
        activeRequestId: prev.activeRequestId,
      };
    }
    case "canplay": {
      if (prev.status === "error") return prev;
      return { status: "ready", pendingPlay: false, activeRequestId: prev.activeRequestId };
    }
    case "playing": {
      return { status: "ready", pendingPlay: false, activeRequestId: prev.activeRequestId };
    }
    case "waiting": {
      if (event.isPlaying || prev.pendingPlay) {
        return {
          status: "loading",
          pendingPlay: true,
          activeRequestId: prev.activeRequestId,
        };
      }
      return prev;
    }
    case "pause": {
      if (prev.status === "error") return prev;
      // Ignore queued `pause` tasks emitted by `el.load()` when `el.play()` has already restarted playback.
      if (!event.isElementPaused) return prev;
      return {
        status:
          prev.status === "loading"
            ? event.readyState >= 1
              ? "ready"
              : "idle"
            : prev.status,
        pendingPlay: false,
        activeRequestId: prev.activeRequestId + 1,
      };
    }
    case "play_rejected": {
      if (event.requestId !== prev.activeRequestId) {
        return prev;
      }
      if (event.aborted) {
        if (event.isElementPaused) {
          return {
            status: event.readyState >= 1 ? "ready" : "idle",
            pendingPlay: false,
            activeRequestId: prev.activeRequestId,
          };
        }
        return prev;
      }
      if (event.hasMediaError || event.notSupported) {
        return {
          status: "error",
          pendingPlay: false,
          activeRequestId: prev.activeRequestId,
        };
      }
      return {
        status: event.readyState >= 1 ? "ready" : "idle",
        pendingPlay: false,
        activeRequestId: prev.activeRequestId,
      };
    }
    case "error": {
      return {
        status: "error",
        pendingPlay: false,
        activeRequestId: prev.activeRequestId + 1,
      };
    }
  }
}

export async function executeCopyWithFallback(options: {
  value: string;
  writeText?: ((text: string) => Promise<void>) | null;
  legacyCopy: (text: string) => boolean;
}): Promise<{ ok: boolean; autoResetMs: number | null }> {
  let ok = false;
  if (typeof options.writeText === "function") {
    try {
      await options.writeText(options.value);
      ok = true;
    } catch {
      ok = options.legacyCopy(options.value);
    }
  } else {
    ok = options.legacyCopy(options.value);
  }
  return {
    ok,
    // Never auto-expire manual recovery on failure while a guest is selecting/copying it.
    autoResetMs: ok ? 2200 : null,
  };
}

export interface PinnedNavState {
  id: string;
  landedScrollY: number | null;
  lockUntilMs: number;
}

export function resolveJumpNavActiveSection(params: {
  sectionIds: readonly string[];
  flowTops: Readonly<Record<string, number>>;
  stickySectionIds?: ReadonlySet<string>;
  scrollY: number;
  viewportHeight: number;
  scrollHeight: number;
  nowMs: number;
  pinned: PinnedNavState | null;
  anchorOffsetPx?: number;
  unpinDeltaPx?: number;
}): { activeId: string; nextPinned: PinnedNavState | null } {
  const {
    sectionIds,
    flowTops,
    stickySectionIds,
    scrollY,
    viewportHeight,
    scrollHeight,
    nowMs,
    pinned,
    anchorOffsetPx = 136,
    unpinDeltaPx = 64,
  } = params;

  if (sectionIds.length === 0) {
    return { activeId: "", nextPinned: null };
  }

  if (pinned && sectionIds.includes(pinned.id)) {
    const jumpedBackToTop =
      pinned.id !== sectionIds[0] &&
      scrollY <= 16 &&
      pinned.landedScrollY !== null &&
      pinned.landedScrollY > unpinDeltaPx;

    if (!jumpedBackToTop) {
      if (nowMs < pinned.lockUntilMs) {
        return {
          activeId: pinned.id,
          nextPinned: { ...pinned, landedScrollY: scrollY },
        };
      }
      const anchorY = pinned.landedScrollY ?? scrollY;
      if (Math.abs(scrollY - anchorY) <= unpinDeltaPx) {
        return {
          activeId: pinned.id,
          nextPinned:
            pinned.landedScrollY === null
              ? { ...pinned, landedScrollY: anchorY }
              : pinned,
        };
      }
    }
  }

  const maxScroll = Math.max(0, scrollHeight - viewportHeight);
  if (maxScroll > 0 && scrollY >= maxScroll - 24) {
    return {
      activeId: sectionIds[sectionIds.length - 1]!,
      nextPinned: null,
    };
  }

  const readingLine = scrollY + anchorOffsetPx;
  const nonStickyIds = stickySectionIds
    ? sectionIds.filter((id) => !stickySectionIds.has(id))
    : sectionIds;
  const candidateIds = nonStickyIds.length > 0 ? nonStickyIds : sectionIds;

  let chosen = candidateIds[0]!;
  let chosenTop: number | null = null;
  for (const id of candidateIds) {
    const top = flowTops[id];
    if (
      typeof top === "number" &&
      top <= readingLine &&
      (chosenTop === null || top > chosenTop + 16)
    ) {
      chosen = id;
      chosenTop = top;
    }
  }

  return { activeId: chosen, nextPinned: null };
}

export function resolveBandColumnClasses(
  hasLeft: boolean,
  hasRight: boolean,
): { leftClass: string | null; rightClass: string | null } {
  if (hasLeft && hasRight) {
    return { leftClass: "lg:col-span-7", rightClass: "lg:col-span-5" };
  }
  if (hasLeft) {
    return { leftClass: "lg:col-span-12", rightClass: null };
  }
  if (hasRight) {
    return { leftClass: null, rightClass: "lg:col-span-12" };
  }
  return { leftClass: null, rightClass: null };
}

export interface GuideAvailabilityInput {
  checkinSteps?: ReadonlyArray<unknown> | null;
  wifiName?: string | null;
  wifiPassword?: string | null;
  parkingSpot?: string | null;
  parkingInstructions?: string | null;
  hasStayGuides?: boolean;
  houseRules?: ReadonlyArray<unknown> | null;
  securityNote?: string | null;
  kitchenAmenities?: ReadonlyArray<string> | null;
  bathroomAmenities?: ReadonlyArray<string> | null;
  generalAmenities?: ReadonlyArray<string> | null;
  checkoutSteps?: ReadonlyArray<unknown> | null;
  nearbyServices?: ReadonlyArray<unknown> | null;
  hostPhone?: string | null;
  ownerPhone?: string | null;
  emergencyContact?: string | null;
}

export interface GuideSectionAvailability {
  arrival: boolean;
  wifi: boolean;
  parking: boolean;
  stayGuides: boolean;
  rules: boolean;
  included: boolean;
  checkout: boolean;
  nearby: boolean;
  emergency: boolean;
}

export function computeGuideSectionAvailability(
  input: GuideAvailabilityInput,
): GuideSectionAvailability {
  const hasArrival = Boolean(input.checkinSteps && input.checkinSteps.length > 0);
  const hasWifi = Boolean(input.wifiName?.trim() && input.wifiPassword?.trim());
  const hasParking = Boolean(
    input.parkingSpot?.trim() || input.parkingInstructions?.trim(),
  );
  const hasStayGuides = Boolean(input.hasStayGuides);
  const hasRules = Boolean(
    (input.houseRules && input.houseRules.length > 0) ||
      input.securityNote?.trim(),
  );
  const hasAmenities = Boolean(
    (input.kitchenAmenities && input.kitchenAmenities.length > 0) ||
      (input.bathroomAmenities && input.bathroomAmenities.length > 0) ||
      (input.generalAmenities && input.generalAmenities.length > 0),
  );
  const hasCheckout = Boolean(input.checkoutSteps && input.checkoutSteps.length > 0);
  const hasNearby = Boolean(input.nearbyServices && input.nearbyServices.length > 0);
  const hasEmergency = Boolean(
    normalizeDialablePhone(input.hostPhone) ||
      normalizeDialablePhone(input.ownerPhone) ||
      normalizeDialablePhone(input.emergencyContact),
  );

  return {
    arrival: hasArrival,
    wifi: hasWifi,
    parking: hasParking,
    stayGuides: hasStayGuides,
    rules: hasRules,
    included: hasAmenities,
    checkout: hasCheckout,
    nearby: hasNearby,
    emergency: hasEmergency,
  };
}
