import { auth } from "@/lib/auth";
import { db } from "@/db";
import { owners, properties } from "@/db/schema";
import { eq } from "drizzle-orm";

export type CalendarActorGate =
  | { kind: "unauthorized" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "ok"; sessionUserId: string; role: string };

/**
 * Admin and manager may act on any property. Manager is a portal-wide role,
 * not a per-property grant. An owner may act only on a property whose owners
 * row points at them. Cleaners and other owners are forbidden.
 */
export async function authorizePropertyCalendarActor(
  propertyId: string
): Promise<CalendarActorGate> {
  const session = await auth();
  if (!session?.user?.id) return { kind: "unauthorized" };

  const [property] = await db
    .select({ ownerId: properties.ownerId })
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);

  if (!property) return { kind: "not_found" };

  const role = session.user.role;
  if (role === "admin" || role === "manager") {
    return { kind: "ok", sessionUserId: session.user.id, role };
  }

  if (role === "owner") {
    const [owner] = await db
      .select({ userId: owners.userId })
      .from(owners)
      .where(eq(owners.id, property.ownerId))
      .limit(1);

    if (owner?.userId === session.user.id) {
      return { kind: "ok", sessionUserId: session.user.id, role };
    }
  }

  return { kind: "forbidden" };
}
