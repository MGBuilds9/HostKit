import { requireAuth } from "@/lib/auth-guard";
import { CleanerShell } from "./cleaner-shell";

export default async function CleanerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth(["cleaner", "admin"]);
  return <CleanerShell>{children}</CleanerShell>;
}
