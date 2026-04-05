import { requireAuth } from "@/lib/auth-guard";
import { OwnerShell } from "./owner-shell";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth(["owner", "admin"]);
  return <OwnerShell>{children}</OwnerShell>;
}
