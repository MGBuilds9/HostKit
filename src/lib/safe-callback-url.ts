/** Same-origin path only. Rejects protocol-relative and absolute URLs. */
export function safeCallbackUrl(raw: string | null | undefined, fallback = "/admin"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (raw.includes("\\") || raw.includes("\n") || raw.includes("\r")) return fallback;
  return raw;
}
