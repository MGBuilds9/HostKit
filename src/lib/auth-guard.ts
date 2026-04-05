import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

type Role = "admin" | "owner" | "manager" | "cleaner";

export async function requireAuth(allowedRoles?: Role[]) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    // Redirect to the user's home portal
    const home =
      session.user.role === "cleaner"
        ? "/cleaner"
        : session.user.role === "owner"
          ? "/owner"
          : "/admin";
    redirect(home);
  }
  return session;
}
