import { requireAuth } from "@/lib/auth-guard";
import { AdminShell } from "./admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth(["admin", "manager"]);
  return <AdminShell>{children}</AdminShell>;
}
