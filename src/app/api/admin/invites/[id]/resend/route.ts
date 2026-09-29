import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invites, properties } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendInviteEmail } from "@/lib/notifications";

function inviteUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://hostkit.mkgbuilds.com";
  return `${base}/invite/${token}`;
}

// POST /api/admin/invites/[id]/resend
// Re-send the invitation email for an existing invite. Admin only.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [invite] = await db
    .select()
    .from(invites)
    .where(eq(invites.id, params.id));

  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invite.acceptedAt) {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 409 });
  }
  if (invite.revokedAt) {
    return NextResponse.json({ error: "Invite has been revoked" }, { status: 409 });
  }

  let propertyName: string | undefined;
  if (invite.propertyId) {
    const prop = await db.query.properties.findFirst({
      where: eq(properties.id, invite.propertyId),
      columns: { name: true },
    });
    propertyName = prop?.name;
  }

  const url = inviteUrl(invite.token);
  await sendInviteEmail(invite.email, url, invite.intendedRole, propertyName);

  return NextResponse.json({ success: true });
}
