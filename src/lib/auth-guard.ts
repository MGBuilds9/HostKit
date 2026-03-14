import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

type Role = "admin" | "owner" | "manager";

export async function requireAuth(allowedRoles?: Role[]) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    redirect("/admin");
  }
  return session;
}
