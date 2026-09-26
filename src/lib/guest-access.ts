import crypto from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/env";

const COOKIE_PREFIX = "guest-access-";
const SESSION_DAYS = 30;

/**
 * Derives a stable, secret-peppered unlock token for a property.
 * The token proves the guest entered the correct access code without
 * storing the code in the cookie.
 */
function unlockToken(slug: string, code: string): string {
  return crypto
    .createHmac("sha256", env.NEXTAUTH_SECRET)
    .update(`${slug}:${code.trim().toLowerCase()}`)
    .digest("hex");
}

function cookieName(slug: string): string {
  return `${COOKIE_PREFIX}${slug}`;
}

/** Constant-time equality that tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
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
  const value = store.get(cookieName(slug))?.value;
  if (!value) return false;
  return safeEqual(value, unlockToken(slug, accessCode));
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
  store.set(cookieName(slug), unlockToken(slug, accessCode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return true;
}
