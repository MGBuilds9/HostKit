import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import { requireAuth } from "@/lib/auth-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <SessionProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6 bg-slate-50">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
