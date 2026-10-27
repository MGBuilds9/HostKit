import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const ALLOWED = ["admin", "manager"] as const;

export async function requireHostAgentApi() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!ALLOWED.includes(session.user.role as (typeof ALLOWED)[number])) {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}
