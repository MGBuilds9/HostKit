import { Resend } from "resend";

/** Sign-in links expire after 30 minutes. */
export const EMAIL_LINK_MAX_AGE_SECONDS = 30 * 60;

const EMAIL_LINK_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_LINK_LIMIT_MAX = 5;

type Slot = { hits: number[] };
const linkSlots = new Map<string, Slot>();

export function decideEmailSignIn(input: {
  user: { isActive: boolean } | null;
  hasPendingInvite: boolean;
}): boolean {
  if (input.user) return input.user.isActive;
  return input.hasPendingInvite;
}

/** The first Google sign-in still becomes admin. An invited address keeps the invite's role. */
export function shouldAutoPromoteToAdmin(
  userCount: number,
  hasPendingInvite: boolean
): boolean {
  return userCount === 1 && !hasPendingInvite;
}

export function takeEmailLinkSlot(email: string, now = Date.now()): boolean {
  const key = email.trim().toLowerCase();
  const slot = linkSlots.get(key) ?? { hits: [] };
  slot.hits = slot.hits.filter((ts) => now - ts < EMAIL_LINK_LIMIT_WINDOW_MS);
  if (slot.hits.length >= EMAIL_LINK_LIMIT_MAX) {
    linkSlots.set(key, slot);
    return false;
  }
  slot.hits.push(now);
  linkSlots.set(key, slot);
  return true;
}

/** Test hook. Production callers never reset this. */
export function resetEmailLinkSlots(): void {
  linkSlots.clear();
}

export async function emailAddressMaySignIn(email: string): Promise<boolean> {
  const address = email.trim().toLowerCase();
  if (!address.includes("@")) return false;

  const { db } = await import("@/db");
  const { users, invites } = await import("@/db/schema");
  const { and, gt, isNull, sql } = await import("drizzle-orm");

  const [user] = await db
    .select({ isActive: users.isActive })
    .from(users)
    .where(sql`lower(${users.email}) = ${address}`)
    .limit(1);

  const [invite] = await db
    .select({ id: invites.id })
    .from(invites)
    .where(
      and(
        sql`lower(${invites.email}) = ${address}`,
        isNull(invites.acceptedAt),
        isNull(invites.revokedAt),
        gt(invites.expiresAt, new Date())
      )
    )
    .limit(1);

  return decideEmailSignIn({
    user: user ?? null,
    hasPendingInvite: !!invite,
  });
}

export async function emailSignInGate(email: string): Promise<true | string> {
  if (!process.env.RESEND_API_KEY) return "/login?error=EmailNotConfigured";
  const allowed = await emailAddressMaySignIn(email);
  if (!allowed) return "/login?error=EmailNotAllowed";
  if (!takeEmailLinkSlot(email)) return "/login?error=EmailRateLimited";
  return true;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSignInEmailHtml(url: string): string {
  const safeUrl = escapeHtml(url);
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;padding:32px;">
          <tr>
            <td>
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6366f1;">HostKit</p>
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Sign in to HostKit</h1>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">This link works for 30 minutes and can only be used once.</p>
              <a href="${safeUrl}"
                style="display:inline-block;padding:10px 20px;background:#6366f1;color:#ffffff;font-size:14px;font-weight:600;border-radius:6px;text-decoration:none;">
                Sign in
              </a>
              <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;word-break:break-all;">
                Or copy this address into your browser:<br>${safeUrl}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendSignInEmail(to: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Email sign-in is not configured");
  }
  const resend = new Resend(apiKey);
  const from =
    process.env.RESEND_FROM_ADDRESS ??
    "HostKit <notifications@updates.mkguirguis.com>";
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Sign in to HostKit",
    html: buildSignInEmailHtml(url),
  });
  if (error) {
    throw new Error("Could not send the sign-in email");
  }
}
