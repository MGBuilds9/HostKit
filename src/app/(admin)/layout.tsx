"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import { BottomTabBar } from "@/components/admin/bottom-tab-bar";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "cleaner") {
      router.replace("/cleaner");
    }
  }, [status, session, router]);

  if (status === "loading") return null;
  if (session?.user?.role === "cleaner") return null;

  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AdminGuard>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 bg-muted">
              {children}
            </main>
          </div>
          <BottomTabBar />
        </div>
      </AdminGuard>
    </SessionProvider>
  );
}
