import crypto from "node:crypto";
import { cookies } from "next/headers";

// Read the secret lazily (not via @/env) so this module stays importable
// during Next.js static page-data collection where full env isn't present.
const secret = () => {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is required");
  return s;
};

const COOKIE_PREFIX = "guest-access-";
const SESSION_DAYS = 30;

/**
 * Derives a stable, secret-peppered unlock token for a property.
 * The token proves the guest entered the correct access code without
 * storing the code in the cookie.
 */
export function deriveGuideUnlockToken(slug: string, code: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${slug}:${code.trim().toLowerCase()}`)
    .digest("hex");
}

export function guestAccessCookieName(slug: string): string {
  return `${COOKIE_PREFIX}${slug}`;
}

/** Constant-time equality that tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/**
 * Pure verification of a guest unlock cookie value against a property's access code.
 * Returns true when the property has no access code (public guide).
 */
export function verifyGuideUnlockCookie(
  slug: string,
  accessCode: string | null,
  cookieValue: string | undefined,
): boolean {
  if (!accessCode) return true;
  if (!cookieValue) return false;
  return safeEqual(cookieValue, deriveGuideUnlockToken(slug, accessCode));
}

/**
 * Server component guard: is the guest currently unlocked for this property?
 * Returns true when the property has no access code (public guide).
 */
export async function isGuideUnlocked(
  slug: string,
  accessCode: string | null,
): Promise<boolean> {
  if (!accessCode) return true;
  const store = await cookies();
  const value = store.get(guestAccessCookieName(slug))?.value;
  return verifyGuideUnlockCookie(slug, accessCode, value);
}

/**
 * Attempt to unlock a guide with a candidate code.
 * On success, sets the unlock cookie and returns true.
 */
export async function unlockGuide(
  slug: string,
  accessCode: string,
  candidate: string,
): Promise<boolean> {
  if (candidate.trim().toLowerCase() !== accessCode.trim().toLowerCase()) {
    return false;
  }
  const store = await cookies();
  store.set(guestAccessCookieName(slug), deriveGuideUnlockToken(slug, accessCode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return true;
}
