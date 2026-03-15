import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

type Role = "admin" | "owner" | "manager" | "cleaner";

export async function requireAuth(allowedRoles?: Role[]) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    // Cleaners go to /cleaner, everyone else to /admin
    redirect(session.user.role === "cleaner" ? "/cleaner" : "/admin");
  }
  return session;
}
