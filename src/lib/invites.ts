import crypto from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { invites, owners, users, cleaners } from "@/db/schema";

export type InviteRole = "owner" | "manager" | "cleaner";

export type ClaimResult =
  | { ok: true; role: InviteRole; propertyId: string | null }
  | {
      ok: false;
      reason:
        | "not_found"
        | "expired"
        | "revoked"
        | "already_accepted"
        | "email_mismatch"
        | "owner_conflict"
        | "user_inactive"
        | "role_protected";
    };

/**
 * Invite role transitions.
 *
 * Google sign-in inserts users with the DB default role "owner" before they
 * claim. That default is provisional until an owners row points at the user.
 * A provisional owner may accept owner, manager, or cleaner — that is how a
 * new account receives its real role.
 *
 * An invite must not reduce privilege that was already granted:
 * - admin: never changed (admin is not an invite role)
 * - manager: never changed to a different role (manager is not the default)
 * - owner with an owners.userId link: never changed to manager or cleaner
 * Same-role claims stay allowed. Cleaner → owner/manager is an upgrade.
 * An admin changes an established role through /api/users/[id]/role.
 */
export function inviteWouldDowngrade(
  currentRole: string,
  targetRole: InviteRole,
  establishedOwner: boolean
): boolean {
  if (currentRole === targetRole) return false;
  if (currentRole === "admin" || currentRole === "manager") return true;
  if (currentRole === "owner" && establishedOwner) return true;
  return false;
}

function inviteUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://hostkit.mkgbuilds.com";
  return `${base}/invite/${token}`;
}

export async function createInvite(opts: {
  email: string;
  intendedRole: InviteRole;
  propertyId?: string | null;
  ownerId?: string | null;
  invitedByUserId: string;
  expiresInDays?: number;
}): Promise<{ token: string; url: string }> {
  const email = opts.email.trim().toLowerCase();
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + (opts.expiresInDays ?? 14) * 24 * 60 * 60 * 1000
  );

  await db.insert(invites).values({
    email,
    intendedRole: opts.intendedRole,
    propertyId: opts.propertyId ?? null,
    ownerId: opts.ownerId ?? null,
    token,
    expiresAt,
    invitedByUserId: opts.invitedByUserId,
  });

  return { token, url: inviteUrl(token) };
}

export async function claimInvite(token: string, userId: string): Promise<ClaimResult> {
  return await db.transaction(async (tx) => {
    // Lock the invite row for the duration of the transaction.
    const inviteRows = await tx
      .select()
      .from(invites)
      .where(eq(invites.token, token))
      .for("update");

    const invite = inviteRows[0];
    if (!invite) return { ok: false, reason: "not_found" };
    if (invite.revokedAt) return { ok: false, reason: "revoked" };
    if (invite.acceptedAt) return { ok: false, reason: "already_accepted" };
    if (invite.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

    // Lock the user so two invites cannot both pass the role check and then
    // overwrite each other. Invite row is already locked above; this order
    // (invite, then user) is the only lock order claim uses.
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    if (!user) return { ok: false, reason: "not_found" };
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return { ok: false, reason: "email_mismatch" };
    }

    // A deactivated account must not claim an invite.
    if (user.isActive === false) {
      return { ok: false, reason: "user_inactive" };
    }

    // Established owner = an owners profile already linked to this user.
    // The default "owner" role on a brand-new Google account is not that.
    let establishedOwner = false;
    if (user.role === "owner") {
      const [linkedOwner] = await tx
        .select({ id: owners.id })
        .from(owners)
        .where(eq(owners.userId, userId))
        .limit(1);
      establishedOwner = !!linkedOwner;
    }

    if (inviteWouldDowngrade(user.role, invite.intendedRole, establishedOwner)) {
      return { ok: false, reason: "role_protected" };
    }

    // Per-role side effects
    if (invite.intendedRole === "owner") {
      if (invite.ownerId) {
        // Atomically claim the owners row only if it is still unclaimed.
        const [claimed] = await tx
          .update(owners)
          .set({ userId })
          .where(and(eq(owners.id, invite.ownerId), isNull(owners.userId)))
          .returning();
        if (!claimed) {
          // Already this user: the profile link exists, so accept the invite.
          // A different user, or a missing row, stays a conflict.
          const [existing] = await tx
            .select({ userId: owners.userId })
            .from(owners)
            .where(eq(owners.id, invite.ownerId))
            .limit(1);
          if (existing?.userId !== userId) {
            return { ok: false, reason: "owner_conflict" };
          }
        }
      }
      await tx
        .update(users)
        .set({ role: "owner", updatedAt: new Date() })
        .where(eq(users.id, userId));
    } else if (invite.intendedRole === "manager") {
      await tx
        .update(users)
        .set({ role: "manager", updatedAt: new Date() })
        .where(eq(users.id, userId));
    } else if (invite.intendedRole === "cleaner") {
      await tx
        .update(users)
        .set({ role: "cleaner", updatedAt: new Date() })
        .where(eq(users.id, userId));

      // Create a cleaners row for this user if none exists.
      const existing = await tx
        .select({ id: cleaners.id })
        .from(cleaners)
        .where(eq(cleaners.userId, userId))
        .limit(1);
      if (existing.length === 0) {
        await tx.insert(cleaners).values({
          userId,
          fullName: user.name ?? user.email,
          email: user.email,
        });
      }
    }

    await tx
      .update(invites)
      .set({ acceptedAt: new Date(), acceptedByUserId: userId })
      .where(eq(invites.id, invite.id));

    return {
      ok: true,
      role: invite.intendedRole,
      propertyId: invite.propertyId,
    };
  });
}

export async function findInviteByToken(token: string) {
  const [invite] = await db.select().from(invites).where(eq(invites.token, token));
  return invite ?? null;
}
